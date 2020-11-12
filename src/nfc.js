import pkg from 'nfc-pcsc'
import tlv from 'node-tlv'

const { NFC } = pkg
const nfc = new NFC()

nfc.on('reader', reader => {
	console.info(`${reader.reader.name}  device attached`)

  reader.autoProcessing = false

	reader.on('card', async card => {
    console.info(`${reader.reader.name}  card detected`, card)

    reader.transmit(Buffer.from([0x00, 0xB2, 0x01, 0x1C, 0x00]), 260).then((response) => {
      // console.info('response:', response.toString('hex'))
      const tags = tlv.parse(response.toString('hex'))
      const cardNumber = tags.find('5A')
      const cardExpiryDate = tags.find('5F24')

      console.info('card number:', cardNumber.value)
      console.info('card expiry date (YYMMDD):', cardExpiryDate.value)

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
