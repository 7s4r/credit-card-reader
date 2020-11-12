import pcsc from 'pcsclite'
import tlv from 'node-tlv'
import Card from './Card.js'
import hexUtil from './utils/hexUtil.js'
import { aidList } from './codes.js'

const app = pcsc()

app.on('reader', function(reader) {
  console.info('New reader detected', reader.name)

  reader.on('error', function(err) {
    console.error('Error(', reader.name, '):', err.message)
  })

  reader.on('status', function(status) {
    console.info('Status(', reader.name, '):', status)
    const changes = this.state ^ status.state

    if (changes) {
      if ((changes & this.SCARD_STATE_EMPTY) && (status.state & this.SCARD_STATE_EMPTY)) {
        console.info('Card removed')
        reader.disconnect(reader.SCARD_LEAVE_CARD, (err) => {
          if (err) {
            console.error(err)
          } else {
            console.info('Disconnected')
          }
        })
      } else if ((changes & this.SCARD_STATE_PRESENT) && (status.state & this.SCARD_STATE_PRESENT)) {
        console.info('Card inserted')
        reader.connect({ share_mode : this.SCARD_SHARE_SHARED }, async (err, protocol) => {
          if (err) {
            console.log(err)
          } else {
            const card = new Card(reader, status.atr, protocol)

            // Display ATR info for purpose only.
            // More info here: https://www.eftlab.com/knowledge-base/171-atr-list-full/
            console.info('ATR = ', hexUtil.toHexString(status.atr))

            // Method with loop through AID list and get FCI template (File Control Information)
            // Other method available: pseSelect() function at the end of file
            for (let i = 0; i < aidList.length; i++) {
              const selectResponse = await card.selectFile(aidList[i].value)

              if (selectResponse.isOk()) {
                console.info('SELECT response:', selectResponse.toString())

                const selectTags = tlv.parse(selectResponse.getDataOnly())
                const pdol = selectTags.find('9F38')
                const gpoTag = pdol && pdol.value ? pdol.value.substring(0, 4) : 0
                const gpoTagLength = pdol && pdol.value ? pdol.value.substring(5) : 0

                console.info('PDOL:', pdol? pdol.value : 'not found')

                // Execute GPO (Get Processing Options)
                const gpoResponse = await card.getProcessingOptions(gpoTag, gpoTagLength)

                console.info('GPO response:', gpoResponse.toString())

                // Find the AFL chunks (Application File Locator) with SFI & range of records
                const gpoTags = tlv.parse(gpoResponse.getDataOnly())
                const afl = gpoTags.find('94')
                const aflChunks = afl.value.match(/.{1,8}/g)
                const aflValues = []

                for (i=0; i < aflChunks.length; i++) {
                  aflValues.push({
                    sfi: aflChunks[i].substring(0, 2),
                    recordStart: aflChunks[i].substring(2, 4),
                    recordEnd: aflChunks[i].substring(4, 6),
                  })
                }

                console.info('AFL values:', JSON.stringify(aflValues))

                // Read card data, PAN & EXPIRY DATE are in the first record (tag 70)
                // reader.transmit(Buffer.from([0x00, 0xB2, 0x01, 0x1C, 0x00]), 40, protocol, (error, data) => {
                //   console.log(error ? error : data)
                // })
                const readRecordResponse = await card.readRecord(0x01, 0x1C)
                
                console.info('READ RECORD response:', readRecordResponse.toString())

                if (readRecordResponse.isOk()) {
                  const tags = tlv.parse(readRecordResponse.getDataOnly())
                  const cardNumber = tags.find('5A')
                  const cardExpiryDate = tags.find('5F24')

                  console.info('card number:', cardNumber.value)
                  console.info('card expiry date (YYMMDD):', cardExpiryDate.value)
                } else {
                  console.info('READ RECORD ERROR:', readRecordResponse.meaning())
                }
                
                break
              } else {
                console.info('SELECT ERROR:', selectResponse.meaning())
              }
            }

            // Close transaction
            reader.close()
            app.close()
          }
        })
      }
    }
  })

  reader.on('end', () => {
    console.log('Reader',  reader.name, 'removed')
  })
})
 
app.on('error', (error) => {
  console.error('PCSC error', error.message)
})

// Method with selection of the PSE (1PAY.SYS.DDF01) or PPSE (2PAY.SYS.DDF01) if contactless
function pseSelect(card) {
  card.selectFile(hexUtil.toHex('1PAY.SYS.DDF01')).then((response) => {
    console.info('PSE response:', response.getDataOnly())
    const tags = tlv.parse(response.getDataOnly())
    const sfiTag = tags.find('88')

    if (sfiTag && sfiTag.value) {
      card.readRecord(sfiTag.value, 0x01).then((response) => {
        console.info(
          'READ RECORD response:',
          response.isOk() ? response.getDataOnly() : response.getStatusCode(),
        )
      })
    } else {
      console.error('ERROR: SFI tag not found')    
    }
  })
}
