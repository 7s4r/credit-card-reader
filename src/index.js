import Device from './Device.js'
import hexUtil from './utils/hexUtil.js'

const device = new Device()

device.on('card-connected', () => {
  device.execute('selectFile', hexUtil.toByteArray('a0000000041010'))
    .then((response) => {
      console.log(`Response: '${response.toString('hex')}`)
    })
    .catch((error) => {
      console.error('ERROR: ', error)
    })
})
