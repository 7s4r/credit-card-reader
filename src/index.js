import Device from './Device.js'

const device = new Device()

device.on('card-connected', async () => {
  console.log('card === ', device.getCard())
  await device.execute('selectFile', 'A0000000031010')
  device.close()
})
