# credit-card-reader

Easy reading on credit cards over PC/SC or NFC with Node.js

## Requirements

[Node.js >= v12](https://nodejs.org/)

For Debian/Ubuntu users, you must also install this packages:

```
apt-get install libpcsclite1 libpcsclite-dev pcscd
```

On MacOS, PC/SC is already installed.

## Hardware requirements

[Gemalto chip smart card reader](https://amzn.to/3caTTVQ)

[ACS NFC smard card reader](https://amzn.to/3v7zycu)

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

## HackRF (WIP)

```
node src/hackrf.js
```
