import pcsc from 'pcsclite'
import tlv from 'node-tlv'
import Card from './Card.js'
import hexUtil from './utils/hexUtil.js'
import tlvUtil from './utils/tlvUtil.js'
import { aidList } from './codes.js'

const pcscApp = pcsc()

pcscApp.on('reader', function(reader) {
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

            // First method: select the PSE (1PAY.SYS.DDF01) or PPSE (2PAY.SYS.DDF01) if contactless
            // card.selectFile(hexUtil.toHex('1PAY.SYS.DDF01')).then((response) => {
            //   console.info('Response for PSE: ', response.getDataOnly())
            //   const tags = tlv.parse(response.getDataOnly())
            //   const sfiTag = tags.find('88')
    
            //   if (sfiTag && sfiTag.value) {
            //     card.readRecord(sfiTag, sfiTag).then((response) => {
            //       console.info('Response for READ RECORD: ', response)
            //     })
            //   } else {
            //     console.error('ERROR: SFI tag not found')    
            //   }
            // })

            // Second method: loop through AID list and get FCI template (File Control Information)
            for (let i = 0; i < aidList.length; i++) {
              const response = await card.selectFile(aidList[i].value)

              if (response.isOk()) {
                console.info('Response ok:', response.getDataOnly())
                const tags = tlv.parse(response.getDataOnly())
                const pdol = tags.find('9F38')

                if (pdol && pdol.value) {
                  const gpoTag = pdol.value.substring(0, 4)
                  const gpoTagLength = pdol.value.substring(5)

                  console.info('GPO required tag:', gpoTag, gpoTagLength)

                  // Execute GPO (Get Processing Options)
                  card.getProcessingOptions(gpoTag, hexUtil.toHex(gpoTagLength)).then((response) => {
                    console.info('GPO response:', response)
                    // 5. find the AFL tag (Application File Locator)
                    const tags = tlv.parse(response)
                    const afl = tags.find('94')

                    // 6. READ RECORD (PAN (5A), Expiration date YYMMDD (5F24))
                    card.readRecord(1, 0x01).then((response) => {
                      console.info('Response for READ RECORD:', response)
                    })
                  })
                } else {
                  console.error('PDOL not found')
                }
                
                break
              } else {
                console.info('Response not ok:', response.meaning())
              }
            }

            // Close transaction
            reader.close()
            pcscApp.close()
          }
        })
      }
    }
  })

  reader.on('end', () => {
    console.log('Reader',  reader.name, 'removed')
  })
})
 
pcscApp.on('error', (error) => {
  console.error('PCSC error', error.message)
})
