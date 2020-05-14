const hexUtil = {
  toByteArray: function(hexStr) {
    const hex = []
    const arr = hexStr.match(/[0-9a-fA-F]{2}/g)

    arr.forEach((h) => hex.push(parseInt(h, 16)))

    return hex
  },
  toHexString: function(byteArray) {
    let str = ''

    byteArray.forEach((b) => {
      const hex = (b.toString(16))
      
      str += (hex.length < 2 ? '0' + hex : hex)
    })

    return str
  },
}

export default hexUtil
