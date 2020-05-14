import Device from './Device.js'

const device = new Device()
const card = device.getCard()

if (card) {
  const response = card.selectFile('A0000000031010')

  if (response) {
    console.info('Data received', response)
    device.close()
  }
} else {
  console.info('Waiting for card...')
}
