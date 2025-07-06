## Clarinet Console CLI Cheat Sheet

The Clarinet Console is an interactive environment for testing and interacting with your Clarity smart contracts. While it supports special `::` style commands for managing accounts, blocks, and the environment, you can also run any valid Clarity expression directly in the console—including calling functions on contracts you've deployed.

Use the `::` commands for tasks like setting the transaction sender, minting STX, or advancing the chain tip. For contract interaction, simply enter Clarity expressions or contract calls as you would in your code.

---

### Basic Commands

| Command                          | Description                                    |
|----------------------------------|------------------------------------------------|
| `::help`                         | Display all available commands                 |
| `::get_assets_maps`              | Show assets maps for active accounts           |
| `::set_tx_sender <principal>`    | Set `tx-sender` to a principal                 |
| `::mint_stx <principal> <amount>`| Mint STX for a given principal                 |
| `::get_contracts`                | List loaded contracts                          |
| `::get_block_height`             | Show current block height                      |
| `::get_epoch`                    | Show current epoch                             |

---

## Testing your contract
### Transfer 1 token to a new address

Copy and paste each step into the Clarinet Console to test a contract call:

1. Check the initial balance of the transaction sender:
```clojure
(contract-call? .token get-balance tx-sender)
```

2. Show the assets map for all active accounts:
```clojure
::get_assets_maps
```

3. Transfer 1 token from the transaction sender to another principal:
```clojure
(contract-call? .token transfer u1 tx-sender 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 none)
```

4. Check the new balance of the transaction sender:
```clojure
(contract-call? .token get-balance tx-sender)
```

5. Show the assets map again to see the updated balances after the transfer:
```clojure
::get_assets_maps
```

6. Check the new balance of the transaction recipient:
```clojure
(contract-call? .token get-balance 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5)
```

---

**Tip:** You can use the commands above to interact with your contracts, transfer tokens, set transaction senders, and more—all from the Clarinet Console.

### Advanced Commands

| Command                                         | Description                                                      |
|-------------------------------------------------|------------------------------------------------------------------|
| `::functions`                                   | List all native functions in Clarity                             |
| `::keywords`                                    | List all native keywords in Clarity                              |
| `::describe <function> \| <keyword>`            | Show documentation for a function or keyword                     |
| `::toggle_costs`                                | Toggle cost analysis after every expression                      |
| `::toggle_timings`                              | Toggle execution duration display                                |
| `::advance_chain_tip <count>`                   | Simulate mining `<count>` blocks                                 |
| `::advance_stacks_chain_tip <count>`            | Simulate mining `<count>` Stacks blocks                          |
| `::advance_burn_chain_tip <count>`              | Simulate mining `<count>` burnchain blocks                       |
| `::set_epoch <epoch>`                           | Set the current epoch                                            |
| `::debug <expr>`                                | Start interactive debug session for `<expr>`                     |
| `::trace <expr>`                                | Generate execution trace for `<expr>`                            |
| `::get_costs <expr>`                            | Display cost analysis for `<expr>`                               |
| `::reload`                                      | Reload existing contract(s)                                      |
| `::read <filename>`                             | Read and execute expressions from a file                         |
| `::encode <expr>`                               | Encode an expression to Clarity Value bytes                      |
| `::decode <bytes>`                              | Decode Clarity Value bytes to an expression                      |

---