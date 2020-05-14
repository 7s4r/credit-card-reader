import EventEmitter from 'events'
import pcsclite from 'pcsclite'
import Card from './Card'

class Device extends EventEmitter
{
    constructor(options) {
        super()
        this._pcsc = pcsclite()
        this._card = null
        this._status = null
        options = options || {}

        this._pcsc.on('error', error => {
          this.emit('error', { error })
          console.error('PCSC error', error.message)
        }).on('reader', reader => {
          this._reader = reader
          this._name = reader.name
          this._shareMode = options.shareMode || reader.SCARD_SHARE_SHARED,
          this._disposition = options.disposition || reader.SCARD_LEAVE_CARD,
          this.emit('device-activated')
          console.info('New reader detected', reader.name)
        })

        const
          autoConnect = options.autoConnect || true,
          autoDisconnect = options.autoDisconnect || true,
          isCardInserted = options.isCardInserted || this.defaultIsCardInserted,
          isCardRemoved = options.isCardRemoved || this.defaultIsCardRemoved

        this._reader.on('status', status => {
            this._status = status

            const changes = this._reader.state ^ status.state

            if (changes) {
                this.emit('status', status)
                console.info('Status: ', status)

                if (isCardRemoved(changes, this._reader, status)) {
                    this.emit('card-left', status)
                    console.info('Card left')

                    autoDisconnect && this.cardRemoved()
                } else if (isCardInserted(changes, this._reader, status)) {
                    this.emit('card-detected', status)
                    console.info('Card detected')

                    autoConnect && this.cardInserted()
                }
            }
        })
    }

    cardInserted() {
      this.connect({ share_mode: this._shareMode }).then(event => {
        this.emit('card-inserted', event)
        console.info('Card inserted')
      }).catch(this.emit.bind(this, 'error'))
    }

    cardRemoved() {
      // const card = this.getCard()

      this.disconnect(this._disposition).then(event => {
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
      return new Promise((ok, nok) => this._reader.transmit(data, resLen, protocol, (e, r) => e ? nok(e) : ok(r)))
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

        this._reader.connect(options, callback)
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

        this._reader.disconnect(disposition, callback)
      })
    }

    getStatus() {
      return this._status
    }

    setCard(card) {
      this._card = card instanceof Card ? card : null
    }

    getCard() {
      return this._card
    }

    getName() {
      return this._name
    }

    toString() {
      return `Device(name:'${this.getName()}')`
    }

    close() {
      this._reader.close()
    }
}

export default Device
