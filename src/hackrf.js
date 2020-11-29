import pkg from 'hackrf.js'

const { listDevices, open, UsbBoardId } = pkg;

(async function() {
  for await (const info of listDevices()) {
    console.log(`Found ${UsbBoardId[info.usbBoardId]}`)
    console.log(`Serial: ${info.serialNumber}`)
  }

  const device = await open('000000000000000026b468dc381e988f')

  console.log('device', device)

  await device.setSampleRate(10e6)  // 10 Msps
  await device.setFrequency(1356e6) // 13.56 MHz
  await device.setAmpEnable(false)  // RF amplifier = off
  // for RX only
  await device.setLnaGain(8)        // IF gain = 8dB
  await device.setVgaGain(12)       // BB gain = 12dB
  // for TX only
  // await device.setTxVgaGain(8)      // IF gain = 8dB

  await device.receive(array => {
    // TODO: Process the samples in `array`
    // - Every 2 items form an I/Q sample
    // - int8 means the range is -128 to +127
    console.log('array', array)
})
})()
