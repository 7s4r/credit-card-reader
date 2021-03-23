import nfcPcsc from 'nfc-pcsc'
import tlv from 'node-tlv'
import luhn from 'fast-luhn'
import creditCardType from 'credit-card-type'

const nfc = new nfcPcsc.NFC()

nfc.on('reader', reader => {
	console.info(`${reader.reader.name}  device attached`)

  reader.autoProcessing = false

	reader.on('card', async card => {
    console.info(`${reader.reader.name}  card detected`, card)

    reader.transmit(Buffer.from([0x00, 0xB2, 0x01, 0x1C, 0x00]), 260).then((response) => {
      console.info('response:', response.toString('hex'))
      const tags = tlv.parse(response.toString('hex'))
      const cardNumber = tags.find('5A')
      const cardExpiryDate = tags.find('5F24')

      if (cardNumber) {
        const cardNumberValue = cardNumber.value
        const cardType = creditCardType(cardNumberValue)

        if (cardType && cardType.length > 0) {
          console.info('card type:', cardType[0].niceType)
        }
  
        console.info('card number:', cardNumberValue)
        console.info('card expiry date (YYMMDD):', cardExpiryDate && cardExpiryDate.value)
        console.info('is valid:', luhn(cardNumberValue))
      } else {
        console.error('Card number not found!')
      }

      reader.close()
      nfc.close()
    }).catch((error) => {
      console.error('ERROR:', error)
    })
	})

	reader.on('card.off', card => {
		console.info(`${reader.reader.name}  card removed`, card)
	})

	reader.on('error', err => {
		console.error(`${reader.reader.name}  an error occurred`, err)
	})

	reader.on('end', () => {
		console.info(`${reader.reader.name}  device removed`)
	})

})

nfc.on('error', err => {
	console.error('An error occurred:', err)
})
