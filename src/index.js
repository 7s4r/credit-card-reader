import Device from './Device'

const device = new Device()
const card = device.getCard()
const response = card.selectFile('A0000000031010')

if (response) {
  console.info('Data received', response)
  device.close()
}
