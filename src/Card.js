import { EventEmitter } from 'events'
import ApduResponse from './ApduResponse.js'
import ApduCommand from './ApduCommand.js'
import hexUtil from './utils/hexUtil.js'
import { instructions } from './codes.js'

class Card extends EventEmitter
{
    constructor(device, atr, protocol) {
      super()
      this.device = device
      this.protocol = protocol
      this.atr = atr.toString('hex')
    }

    getAtr() {
      return this.atr
    }

    toString() {
      return `Card(atr:'${this.atr}')`
    }

    emitCommand(apduCommand, callback) {
      let buffer

      if (Array.isArray(apduCommand)) {
        buffer = Buffer.from(apduCommand)
      } else if (typeof apduCommand === 'string') {
        buffer = Buffer.from(hexUtil.toByteArray(apduCommand))
      } else if (Buffer.isBuffer(apduCommand)) {
        buffer = apduCommand
      } else {
        buffer = apduCommand.toBuffer()
      }

      const protocol = this.protocol

      this.emit('command-emitted', {card: this, command: apduCommand})
      console.info('Command emitted')

      if (callback) {
        this.device.transmit(buffer, 0x102, protocol, (err, response) => {
          this.emit('response-received', {
            card: this,
            command: apduCommand,
            response: new ApduResponse(response),
          })
          console.info('Response received: ', new ApduResponse(response))
          callback(err, response)
        })
      } else {
        return new Promise((resolve, reject) => {
          this.device.transmit(buffer, 0x102, protocol, (err, response) => {
            if (err) {
              reject(err)
            } else {
              this.emit('response-received', {
                card: this,
                command: apduCommand,
                response: new ApduResponse(response),
              })
              resolve(response)
            }
          })
        })
      }
    }

    parseCardResponse(apduCommand) {
      return this.emitCommand(apduCommand).then(resp => {
        const response = new ApduResponse(resp)

        if (response.hasMoreBytesAvailable()) {
          return this.getResponse(response.numberOfBytesAvailable()).then(res => {
            const resp = new ApduResponse(res)
              
            return new ApduResponse(response.getDataOnly() + resp.toString())
          })
        } else if (response.isWrongLength()) {
          apduCommand.setLe(response.correctLength())

          return this.emitCommand(apduCommand).then(res => {
            const resp = new ApduResponse(res)
            
            return new ApduResponse(response.getDataOnly() + resp.toString())
          })
        }

        return response
      }).catch((error) => console.error('[COMMAND ERROR]: ', error))
    }

    selectFile(bytes, p1, p2) {
      const apduCommand = new ApduCommand({
        cla: 0x00,
        ins: instructions.SELECT_FILE,
        p1: p1 || 0x04,
        p2: p2 || 0x00,
        data: hexUtil.toByteArray(bytes),
      })

      return this.parseCardResponse(apduCommand).then(response => {
        if (response.isOk()) {
          const application = bytes
          
          this.emit('application-selected', { application })
          console.info('Application selected:', application)
        }

        return response
      })
    }

    getProcessingOptions(value, length) {
      return this.parseCardResponse(new ApduCommand({
        cla: 0x80,
        ins: instructions.GET_PROCESSING_OPTIONS,
        p1: 0x00,
        p2: 0x00,
        data: hexUtil.toByteArray(`83${length}${value}`),
        le: 0,
      }))
    }

    getResponse(length) {
      return this.parseCardResponse(new ApduCommand({
        cla: 0x00,
        ins: instructions.GET_RESPONSE,
        p1: 0x00,
        p2: 0x00,
        le: length,
      }))
    }

    readRecord(sfi, record) {
      return this.parseCardResponse(new ApduCommand({
        cla: 0x00,
        ins: instructions.READ_RECORD,
        p1: record,
        p2: (sfi << 3) + 4,
        le: 0,
      }))
    }

    getData(p1, p2) {
      return this.parseCardResponse(new ApduCommand({
        cla: 0x00,
        ins: instructions.GET_DATA,
        p1: p1,
        p2: p2,
        le: 0,
      }))
    }
}

export default Card
