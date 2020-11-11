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
  toHex: function(str) {
    let hex = ''

    for (let i=0; i<str.length; i++) {
      hex += str.charCodeAt(i).toString(16)
    }

    return hex
  },
  stringToUTF8Bytes: function(string) {
    return new TextEncoder().encode(string)
  },
  bytesToHex: function(bytes) {
    return Array.from(
      bytes,
      byte => byte.toString(16).padStart(2, "0"),
    ).join("")
  },
}

export default hexUtil
