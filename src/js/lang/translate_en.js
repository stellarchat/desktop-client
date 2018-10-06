/* exported translate_en */
var translate_en = {
  header_wellcome : 'Stellar is a platform that connects banks, payments systems, and people.',
  login_desc : 'You can only use a secret key to access an existing account. This is because the desktop client stores your login information locally on your computer, so your account is as safe as the security of your personal computer.',
  open_wallet: 'Open wallet',
  create_wallet: 'Create wallet',
  open_account : 'Open account',
  open_temp_act: 'Temporary Wallet',
  select_file : 'Select account file',
  create_new_account : 'Create new account',
  create_new_account_info : 'Wallet will create a local file for your secret that will be encrypted with password of your choice. Encrypted file is not recommended way to access your wallet. Please consider a hardware wallet.',
  account_password : 'Account password',
  open_existed_account : 'Open existing account',
  create_blank : 'Generate a new account',
  create_by_secret : 'Encrypt an existing key',
  encrypt_new_file : 'Encrypt your new account',
  wallet_file : 'Wallet file',
  password : 'Password',
  pwd_weak : 'Your password is weak. It is not a mix of letters, numbers and symbols.',
  password_confirm : 'Confirm password',
  pwd_not_match : 'Passwords do not match',
  encrypt_account : 'Encrypt account',
  cancel : 'Cancel',
  create_secret : 'Create account with secret key',
  enter_secret : 'Enter your secret key',
  invalid_account: 'Account is invalid',
  invalid_secret : 'Secret is invalid',
  important : 'IMPORTANT',
  wallet_created: 'Your new account has been encrypted. Make sure to have multiple backups of this file.',
  security_notice : 'The secret key below gives access to your money in the unlikely case that you lose your password. With this secret key alone anyone can retrieve your money. So please store it somewhere PRIVATE AND SAFE.',
  show_password : 'Show password',
  hide_password : 'Hide password',
  account_address : 'Account address',
  stellar_address : 'Stellar address',
  secret_key : 'Secret key and QRCode:',
  show_secret: 'Show secret key',
  hide_secret: 'Hide secret key',
  are_you_sure_secret: 'Are you in a safe place where no person or camera can see your screen?',
  save_safe: 'Have you saved your secret key somewhere safe?',
  yes_save: 'Yes, I saved my secret key',
  ledger_wallet: 'Ledger Wallet',
  ledger_wallet_connect: 'Please connect Ledger.',
  /** Balance & Trust **/
  balance : 'Balance',
  estimated : 'Estimated value of holdings:',
  reserve   : 'Reserve:',
  total : 'Total',
  trust : 'Trust',
  asset : 'Asset',
  trust_limit : 'Trust Limit',
  add_trust : 'Add trust from known anchors',
  trust_src : 'This is a list of anchors from the Stellar community.',
  trust_note: 'Note: We do NOT endorse any of these anchors.',
  trust_remove : 'Remove trust line',
  trust_remove_desc : 'Trust is removable when balance is 0',
  trust_removeing : 'Removing...',
  trust_add : 'Create trust line for',
  fed_add : 'Add trust via federation',
  fed_desc: 'You can add trust using the federation URL.',
  fed_url : 'Federation URL',
  fed_unable : 'Unable to find currencies for',
  fed_loading: 'Loading currencies for',
  manual_add : 'Manually add trust',
  manual_desc: 'You can add trust manually if you know the account ID and asset code',
  issuer_invalid : 'Asset issuer account ID must be a valid account ID',
  memo_invaid    : 'Invalid memo.',
  trust_granted  : 'Trust is granted!',

  /** send **/
  send : 'Send',
  send_pick : 'Choose asset to send',
  send_desc : 'Currently we only support sending assets directly.',
  send_note : 'Note: The target address must also trust the asset you are sending.',
  recipient : 'Recipient',
  memo: 'Memo',
  invalid_domain : 'is unavailable',
  account_loading: 'Loading account for',
  select_asset : 'Please select an asset to send.',
  sending_to   : 'Sending to',
  send_done    : 'Asset successfully sent.',
  not_funded   : 'Not funded. To create this account, send it at least 1 {{name}}s ({{code}}).',
  can_accept   : 'The account can accept',

  contacts : 'Contacts',
  contact  : 'Contact',
  address  : 'Address',
  add_contact : 'Add contact',
  edit        : 'edit',
  leave_blank : 'Leave blank if not applicable',
  Delete      : 'Delete',
  are_you_sure: 'Are you sure?',
  no_contact  : "You don't have any contacts yet. Click on 'Add contact' button in the top right corner to add a new contact.",
  error_need_contact : 'Please enter a contact.',
  error_same_contact : 'This contact already exists.',
  error_need_address : 'Please enter an address.',
  error_invalid_address : 'Not a valid address.',
  error_already_name    : 'You already have a contact with the same name.',

  /** Convert **/
  convert       : 'Convert',
  convert_title : 'Convert one currency into another',
  convert_input : 'Please enter the conversion details.',
  convert_nopath: 'No acceptable path. Please make sure your account has enough funds.',
  receive       : 'Receive',
  calculating   : 'Calculating',
  path          : 'Path:',

  /** History **/
  history: 'History',
  payments: 'Payments',
  effects: 'Effects',
  trades: 'Transactions',
  latest_payments : 'Latest Payments',
  latest_effects : 'Latest Effects',
  latest_trades : 'Latest Transactions',
  you         : 'You',
  date        : 'Date',
  account_id  : 'Account ID',
  operation   : 'Operation',
  loading     : 'Loading...',
  load_more   : 'Load more',
  no_more     : 'No more transactions left',
  set_options : 'Options',
  set_data    : 'Data',
  batch       : 'Batch',
  source_account : 'Source Account',
  inflation_op   : 'Inflation',

  choose : 'Choose',
  example : 'example',
  refresh : 'Refresh',
  asset_code : 'Asset Code',
  issuer_id : 'Issuer Account ID',
  amount : 'Amount',
  optional : 'Optional',
  required : 'Required',
  require_memo : 'Recipient requires a memo. Please make sure it is correct.',

  trade : 'Trade',
  normal: 'Normal',
  sent  : 'Sent',
  received : 'Received',
  created : 'Created',
  offer : 'Offer',
  offer_cancel    : 'Cancel',
  offer_canceling : 'Canceling...',
  price : 'Price',
  buy   : 'Buy',
  sell  : 'Sell',
  orderbook : 'Orderbook',
  buy_offers : 'Buy Offers',
  sell_offers: 'Sell offers',
  depth : 'Depth',
  manager_offer : 'Manage offers',
  your_buy_offers  : 'Your buy offers',
  your_sell_offers : 'Your sell offers',
  you_have      : 'You have',
  order_amount  : 'Amount',
  price_of_each : 'Price of Each',
  order_value   : 'Order Value',
  offer_success : 'Offer successfully created',
  trade_pick : 'Choose asset to trade',
  as_base    : 'As base asset',
  as_counter : 'As counter asset',
  base_asset    : 'Base asset',
  counter_asset : 'Counter asset',
  pick_book  : 'To see other orderbooks, choose',
  trade_pair : 'your trade pair',
  pick_trade : 'To trade, go back to',
  trade_page : 'trade page',
  advanced   : 'Advanced',
  buying     : 'Buying',
  selling    : 'Selling',

  /** ICO **/
  ico : 'ICO',
  ico_stellar : 'Using Stellar for ICOs',
  ico_note: 'Note: Before becoming involved in an ICO, cryptocurrency investors and enthusiasts need to consider the risks involved when participating. We do NOT endorse any of these projects.',
  ico_instruction: 'After adding the trust line, select "Trade - Convert". You can use any currency to purchase the ICO.',

  /** SIGN OFFLINE **/
  sign_offline: 'Sign offline',
  paste_xdr: 'Please paste your transaction XDR',
  sign_transaction: 'Sign transaction',

  /** Setting & security **/
  settings : 'Settings',
  network  : 'Network',
  proxy    : 'Proxy',
  selected_net    : 'Current Network',
  switch_net      : 'Switch Network',
  switch_net_desc : 'You can switch between different Networks. The testnets are for testing purposes - they are also occasionally reset, so don’t get too attached to them.',
  public_net : 'Public Network',
  test_net   : 'Test Network',
  other_net  : 'User defined',
  'Stellar Public Network' : 'Stellar Public Network',
  'Stellar Test Network' : 'Stellar Test Network',
  'User defined' : 'User defined',
  public_url : 'Public Net URL',
  test_url   : 'Test Net URL',
  other_url  : 'Network URL',
  passphrase : 'Passphrase or id',
  coin_ticket: 'Native asset code',
  fed_protocol: 'Federation Protocol',
  fed_network : 'Name Service (~)',
  fed_network_desc : 'You can use ~name instead of name*federation.domain.',
  you_name_is : 'Your name is',
  fed_ripple  : 'Ripple Service',
  fed_ripple_desc : 'When you enter a Ripple address, it will use below domain to parse.',
  fed_bitcoin  : 'Bitcoin Service',
  fed_bitcoin_desc : 'When you enter a Bitcoin address, it will use below domain to parse.',
  save     : 'Save',
  security : 'Security',
  inflation : 'Inflation Destination',
  inflation_desc : 'New {{name}}s are added to the network at the rate of 1% each year. Each week, the protocol distributes these {{name}}s to any account that gets over .05% of the “votes” from other accounts in the network.',
  inflation_done : 'Inflation Destination was set.',
  inflation_options      : 'Inflation pools',
  inflation_options_desc : 'You can join one of the following inflation pools. You can check their website to check the votes and the fee.',
  inflation_xlmpool  : 'Vote to xlmpool.com',
  inflation_lumenaut : 'Vote to lumenaut.net',
  inflation_moonpool : 'Vote to moonpool.space',
  inflation_donation : 'Support us',
  inflation_donation_desc : 'RippleFox does not ask for donations, but instead, asks for votes.',
  inflation_fox  : 'Vote to RippleFox',

  home_domain : 'Home Domain',
  domain_desc : 'A domain name that can optionally be added to the account. Clients can look up more details from this domain.',
  domain_done : 'Home Domain was set.',
  manage_data : 'Manage Data',
  data_desc1  : 'Allows you to set,modify or delete a Data Entry (name/value pair) that is attached to a particular account. An account can have an arbitrary amount of DataEntries attached to it. Each DataEntry increases the minimum balance needed to be held by the account.',
  data_desc2  : 'DataEntries can be used for application specific things. They are not used by the core Stellar protocol.',
  data_key    : 'Data Entry Name',
  data_value  : 'Data Entry Value',
  data_done   : 'Data entry was set.',
  delete_account : 'Delete Account',
  merge_desc     : 'Danger operation! It transfers the native balance (the amount of {{code}} an account holds) to destination account and removes your account from the ledger.',
  dest_account   : 'Destination Account',
  delete_warning : 'I KNOW EVERYTHING >>',
  back           : 'Back',
  merge_done     : 'Your account was merged to destination.',

  /** Deposit & withdrawl **/
  service : 'Service',
  deposit_withdraw : 'Deposit/Withdraw',
  deposit  : 'Deposit',
  withdraw : 'Withdraw',
  dw_coin  : 'Depositing or withdrawing coins',
  dw_desc_line1 : 'If you want to deposit or withdraw funds, either in fiat or from other blockchains, you may use an anchor service to do so.',
  dw_desc_line2 : 'You\'ll find a selection of service providers in the tabs below. Start by choosing a provider. ',
  anchor   : 'Anchor',
  no_trust : 'Please create the trust line first.',
  alipay    : 'Alipay',
  bank_card : 'Bank',
  fill_form : 'Please fill the form correctly.',
  analyzing : 'Analyzing ...',
  will_recv : 'Recipient will receive',
  can_send  : 'You can send',

  Stellar : 'Stellar',
  stellar_desktop_client : 'Foxlet Wallet',
  app_open_source  : '',
  app_safe_notice  : 'The client stores your login information encrypted locally on your computer. Please backup your secret carefully.',
  app_feedback     : 'Foxlet is open source now! You can reach us out at GitHub:',
  trade_volume : 'Trade Volume',
  wallet : 'Wallet',
  version: 'Version',
  logout : 'Logout',
  new_version_available: 'New version available',

  /** StellarGuard **/
  stellarguard_submitted: 'Your transaction has been submitted to StellarGuard and is awaiting authorization.',
  stellarguard_authorize: 'Authorize Transaction',

  /** FIC Network **/
  ficnetwork: 'FIC ICO',
  ficnetwork_address: 'ETH Address',
  ficnetwork_coins: 'Coins',
  ficnetwork_claim: 'Claim',
  ficnetwork_history: 'History',
  enter_address: 'Enter whitelisted ETH address',
  invalid_eth: 'Invalid Ethereum address',
  eth_address: 'ETH address',
  options: 'Options',
  remove: 'Remove',
  add: 'Add',
  next: 'Next',
  fic_claimed: "Claimed",
  fic_available: "Available",
  lockup: "Lockup",
  actions: "Actions",
  claim: "Claim",
  unlock: "Unlock",
  claim_unlock: "Claim & Unlock",
  fic_address: "Your FIC address:",
  select_eth: "Select whitelisted ETH address:",
  select_lockup: "Select lock up period:",
  select_amount: "Select FIC amount:",
  select_all: "Select all",
  remaining: "Remaining",
  terms: "I agree on terms",
  days: "days",
  from_address: "From your whitelisted ETH address",
  send_to: "Send to Smart Contract address",
  payload: "This payload (as Data field)",
  checking: "checking...",
  done: "Done",
  available_in: "Available in",
  now: "Now",
  sendMyEtherWallet: "Send via MyEtherWallet",


  /** Error **/
  NotFoundError : 'The resource was not found. You must have at least 1 {{name}} in your account for it to be activated! Each trust line or offer requires a 0.5 {{name}}  reserve in addition. To make things easy, send at least 3 {{name}}s to the account.',
  changeTrustLowReserve : 'Not enough funds to create a new trust line. Each trust line requires a 0.5 {{name}} reserve in addition.'
}
