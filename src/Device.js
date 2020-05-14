import EventEmitter from 'events'
import pcsclite from 'pcsclite'
import Card from './Card.js'

class Device extends EventEmitter
{
    constructor(options) {
      super()
      this.pcsc = pcsclite()
      this.card = null
      this.status = null
      options = options || {}

      this.pcsc.on('reader', (reader) => {
        this.reader = reader
        this.name = reader.name
        this.shareMode = options.shareMode || reader.SCARD_SHARE_SHARED
        this.disposition = options.disposition || reader.SCARD_LEAVEcard
        const autoConnect = options.autoConnect || true
        const autoDisconnect = options.autoDisconnect || true
        const isCardInserted = options.isCardInserted || this.defaultIsCardInserted
        const isCardRemoved = options.isCardRemoved || this.defaultIsCardRemoved

        this.emit('reader-detected')
        console.info('Reader detected', reader.name)

        this.reader.on('status', status => {
          this.status = status
          const changes = this.reader.state ^ status.state

          if (changes) {
            this.emit('status', status)
            console.info('Status: ', status)

            if (isCardRemoved(changes, this.reader, status)) {
              this.emit('card-left', status)
              console.info('Card left')

              autoDisconnect && this.cardRemoved()
            } else if (isCardInserted(changes, this.reader, status)) {
              this.emit('card-detected', status)
              console.info('Card detected')

              autoConnect && this.cardInserted()
            }
          }
        })

        this.reader.on('error', (error) => {
          console.error('[READER ERROR]: ', error.message)
        })

        this.reader.on('end', () => {
          console.info('Reader removed')
        })
      })
      
      this.pcsc.on('error', error => {
        this.emit('error', { error })
        console.error('[PCSC ERROR]: ', error.message)
      })
    }

    cardInserted() {
      this.connect({ share_mode: this.shareMode }).then(event => {
        this.emit('card-inserted', event)
        console.info('Card inserted')
      }).catch(this.emit.bind(this, 'error'))
    }

    cardRemoved() {
      this.disconnect(this.disposition).then(event => {
        this.emit('card-removed', event)
        console.info('Card removed')
      }).catch(this.emit.bind(this, 'error'))
    }

    defaultIsCardRemoved(changes, reader, status) {
      return !!(changes & reader.SCARD_STATE_EMPTY) && !!(status.state & reader.SCARD_STATE_EMPTY)
    }

    defaultIsCardInserted(changes, reader, status) {
      return !!(changes & reader.SCARD_STATE_PRESENT) && !!(status.state & reader.SCARD_STATE_PRESENT)
    }

    transmit(data, resLen, protocol) {
      return new Promise((ok, nok) => this.reader.transmit(data, resLen, protocol, (e, r) => e ? nok(e) : ok(r)))
    }

    connect(options = {}) {
      return new Promise((ok, nok) => {
        const callback = (error, protocol) => {
          if (error) {
            return nok(error)
          }
          this.setCard(new Card(this, this.getStatus().atr, protocol))
          ok({device: this, protocol, card: this.getCard()})
        }

        this.reader.connect(options, callback)
      })
    }

    disconnect(disposition = undefined) {
      return new Promise((ok, nok) => {
        const
          card = this.getCard(),
          callback = error => {
              if (error) {
                  return nok(error)
              }
              this.setCard(null)
              ok({name: this.name, card})
          }

        this.reader.disconnect(disposition, callback)
      })
    }

    getStatus() {
      return this.status
    }

    setCard(card) {
      this.card = card instanceof Card ? card : null
    }

    getCard() {
      return this.card
    }

    getName() {
      return this.name
    }

    toString() {
      return `Device(name:'${this.getName()}')`
    }

    close() {
      this.reader.close()
      this.pcsc.close()
    }
}

export default Device
