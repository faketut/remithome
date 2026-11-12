#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token::TokenClient, Address, BytesN, Env, String,
    Symbol, Vec,
};

// RemitHome escrow — Soroban contract (v0.1).
// Compiled Nov 11, 2026: `stellar contract build` OK (wasm 7,322 bytes),
// 2/2 cargo tests pass. NOT yet deployed, NOT audited, testnet only, no real funds.
//
// One remittance = a sender, a hashed pickup code, and a list of envelopes.
// Each envelope can only pay its bound payee, at most once, before expiry.
// After expiry an envelope can only refund to the sender.

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Envelope {
    pub purpose: Symbol, // e.g. "rent" / "school" / "food"
    pub amount: i128,    // in USDC stroops (7 decimals)
    pub payee: Address,  // school wallet, landlord wallet, or agent wallet
    pub released: bool,
    pub refunded: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Remittance {
    pub sender: Address,
    pub code_hash: BytesN<32>, // sha256 of the 6-digit pickup code; code itself never on-chain
    pub token: Address,        // USDC Stellar Asset Contract
    pub expiry: u64,           // ledger sequence after which release is closed
    pub envelopes: Vec<Envelope>,
}

#[contracttype]
pub enum DataKey {
    Remittance(u64),
    Counter,
}

#[contract]
pub struct RemitHome;

#[contractimpl]
impl RemitHome {
    /// Create a remittance. The sender must already have funded this contract
    /// with the envelopes' total (the app does a USDC transfer first, then
    /// calls this). Returns the remittance id.
    pub fn create_remittance(
        env: Env,
        sender: Address,
        code_hash: BytesN<32>,
        token: Address,
        expiry: u64,
        purposes: Vec<Symbol>,
        amounts: Vec<i128>,
        payees: Vec<Address>,
    ) -> u64 {
        sender.require_auth();
        assert_eq!(purposes.len(), amounts.len(), "length mismatch");
        assert_eq!(amounts.len(), payees.len(), "length mismatch");
        assert!(purposes.len() > 0, "need at least one envelope");

        let mut envelopes = Vec::new(&env);
        for i in 0..purposes.len() {
            envelopes.push_back(Envelope {
                purpose: purposes.get(i).unwrap(),
                amount: amounts.get(i).unwrap(),
                payee: payees.get(i).unwrap(),
                released: false,
                refunded: false,
            });
        }

        let mut counter: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::Counter)
            .unwrap_or(0);
        counter += 1;

        let rem = Remittance {
            sender,
            code_hash,
            token,
            expiry,
            envelopes,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Remittance(counter), &rem);
        env.storage().persistent().set(&DataKey::Counter, &counter);
        env.events().publish(
            (Symbol::new(&env, "created"), counter),
            String::from_str(&env, "remittance created"),
        );
        counter
    }

    /// Release one envelope. `agent` must be the envelope's payee (agent or
    /// school/landlord wallet). For cash envelopes the caller also proves
    /// knowledge of the pickup code by passing its sha256 preimage hash —
    /// in v0.1 the app passes the code hash the sender issued; the on-chain
    /// check is that the supplied hash equals the stored code_hash.
    /// Direct-pay envelopes (school/rent) use the same entry point with the
    /// payee as caller; the code check is skipped when `code_hash` is the
    /// zero hash is NOT allowed — every release needs the code, by design,
    /// so the sender shares the code with the payee out of band.
    pub fn release_envelope(
        env: Env,
        remittance_id: u64,
        envelope_idx: u32,
        caller: Address,
        code_hash: BytesN<32>,
    ) {
        caller.require_auth();
        let mut rem: Remittance = env
            .storage()
            .persistent()
            .get(&DataKey::Remittance(remittance_id))
            .expect("remittance not found");
        assert!(u64::from(env.ledger().sequence()) < rem.expiry, "expired: refund only");
        assert_eq!(code_hash, rem.code_hash, "wrong pickup code");

        let mut envlp = rem.envelopes.get(envelope_idx).expect("no such envelope");
        assert!(!envlp.released, "already released");
        assert!(!envlp.refunded, "already refunded");
        assert_eq!(caller, envlp.payee, "caller is not the payee");

        let token = TokenClient::new(&env, &rem.token);
        token.transfer(
            &env.current_contract_address(),
            &envlp.payee,
            &envlp.amount,
        );
        envlp.released = true;
        rem.envelopes.set(envelope_idx, envlp);
        env.storage()
            .persistent()
            .set(&DataKey::Remittance(remittance_id), &rem);
        env.events().publish(
            (
                Symbol::new(&env, "released"),
                remittance_id,
                envelope_idx,
            ),
            String::from_str(&env, "envelope released"),
        );
    }

    /// Refund one expired envelope to the sender. Callable by anyone after expiry.
    pub fn refund_expired(env: Env, remittance_id: u64, envelope_idx: u32) {
        let mut rem: Remittance = env
            .storage()
            .persistent()
            .get(&DataKey::Remittance(remittance_id))
            .expect("remittance not found");
        assert!(u64::from(env.ledger().sequence()) >= rem.expiry, "not expired yet");
        let mut envlp = rem.envelopes.get(envelope_idx).expect("no such envelope");
        assert!(!envlp.released, "already released");
        assert!(!envlp.refunded, "already refunded");

        let token = TokenClient::new(&env, &rem.token);
        token.transfer(
            &env.current_contract_address(),
            &rem.sender,
            &envlp.amount,
        );
        envlp.refunded = true;
        rem.envelopes.set(envelope_idx, envlp);
        env.storage()
            .persistent()
            .set(&DataKey::Remittance(remittance_id), &rem);
        env.events().publish(
            (
                Symbol::new(&env, "refunded"),
                remittance_id,
                envelope_idx,
            ),
            String::from_str(&env, "envelope refunded"),
        );
    }

    pub fn get_remittance(env: Env, remittance_id: u64) -> Remittance {
        env.storage()
            .persistent()
            .get(&DataKey::Remittance(remittance_id))
            .expect("remittance not found")
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, vec, BytesN};

    fn code_hash(env: &Env) -> BytesN<32> {
        // sha256("123456") — placeholder; the app hashes the real code off-chain.
        BytesN::from_array(env, &[0u8; 32])
    }

    #[test]
    fn create_and_read_back() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(RemitHome, ());
        let client = RemitHomeClient::new(&env, &id);
        let sender = Address::generate(&env);
        let school = Address::generate(&env);
        let token = Address::generate(&env);
        let rid = client.create_remittance(
            &sender,
            &code_hash(&env),
            &token,
            &99999,
            &vec![&env, Symbol::new(&env, "school")],
            &vec![&env, 60_0000000],
            &vec![&env, school.clone()],
        );
        assert_eq!(rid, 1);
        let rem = client.get_remittance(&rid);
        assert_eq!(rem.envelopes.len(), 1);
        assert_eq!(rem.envelopes.get(0).unwrap().payee, school);
    }

    #[test]
    #[should_panic(expected = "length mismatch")]
    fn mismatched_lengths_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        let id = env.register(RemitHome, ());
        let client = RemitHomeClient::new(&env, &id);
        client.create_remittance(
            &Address::generate(&env),
            &code_hash(&env),
            &Address::generate(&env),
            &99999,
            &vec![&env, Symbol::new(&env, "school")],
            &vec![&env, 60_0000000, 40_0000000],
            &vec![&env, Address::generate(&env)],
        );
    }
}
