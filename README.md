# smartcard
Easy reading and writing on smartcards over PC/SC with Node.js


## Requirements
[Node.js >= v12](https://nodejs.org/)

For Debian/Ubuntu users, you must also install this packages:
```
apt-get install libpcsclite1 libpcsclite-dev pcscd
```

On MacOS, PC/SC is already installed.


## Getting Started

To get started, first install all the necessary dependencies.
```
npm install
```

## Get data from card by chip

```
node src/chip.js
```

## Get data from card by NFC

```
node src/nfc.js
```
