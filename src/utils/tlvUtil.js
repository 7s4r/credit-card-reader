import { emvTags } from '../codes.js'

const tlvUtil = {
  toHexString: function(string) {
    return string.toString(16)
  },
  toString: function(data) {
    const value = data.value
    let decoded = '\n'
  
    if (Buffer.isBuffer(value)) {
      decoded = value.toString() + ' ' + value.toString('hex')
    }
  
    let str = '' + data.tag.toString(16) + ' (' + emvTags[data.tag.toString(16).toUpperCase()] + ') ' + decoded
    
    if (data.value && Array.isArray(data.value)) {
      data.value.forEach(function (child) {
        str += '\t' + toString(child)
      })
    }

    str += '\n'

    return str
  },
  parseTagsfromString: function(string) {
    const tags = []
  
    // start after header, assuming header length is always 6
    var i = 6
  
    while (i < string.length) {
      const tag = string.substring(i, i + 2)

      i += 2

      const valueLength = Number(string.substring(i, i + 2))

      i += 2

      const value = string.substring(i, i + valueLength)

      i += valueLength

      tags.push({tag: tag, value: value})
    }
  
    return tags
  },
  findTag: function(data, tag) {
    if (data.tag === tag) {
      return data.value
    } else if (data.value && Array.isArray(data.value)) {
      for (let i = 0; i < data.value.length; i++) {
        let result = this.find(data.value[i], tag)
  
        if (result) {
          return result
        }
      }
    }
  },
}

export function showTlv(tlvData, tab) {
  if(!tab) tab = 0
  let tabStr = ''

  for(let i = 0; i < tab; i++){
    tabStr = tabStr + ' '
  }
  console.log(tabStr +
    'T:(0x' + tlvUtil.toHexString(tlvData.T) + ' / ' + tlvData.T + ')' +
    ' L:' + tlvData.L)
  if( Object.prototype.toString.call( tlvData.V ) === '[object Array]' ) {
    for(let j = 0; j < tlvData.V.length; j++){
      if(isNaN(tlvData.V[j])){
        showTlv(tlvData.V[j], tab+2)
      } else {
        console.log(tabStr + '  | [' + String('00' + i).slice(-2) + '] 0x' + tlvUtil.toHexString(tlvData.V[j]))
      }
    }
  } else {
    console.log(tabStr + 'V:' + JSON.stringify(tlvData.V))
  }
}

export function parseTlv(stkCmd) {
  var ret, nextV = stkCmd.slice(2)

  if(stkCmd.length < 2 ){
    return stkCmd
  } else if(nextV.length < stkCmd[1] ){
    return stkCmd
  } else if(nextV.length === stkCmd[1] ){
    ret = {}
    ret.T = stkCmd[0]
    ret.L = stkCmd[1]
    ret.V = parseTlv(nextV)

    return ret
  } else {
    ret = []
    for(var i = 0, length = 0; i < nextV.length; i = i + length + 2){
      length = stkCmd[i+1]
      const ccc = stkCmd.slice(i, i+length+2)

      ret.push(parseTlv(ccc))
    }

    return ret
  }
}

export function tlvStrToArray(stkStrCmd) {
  const arrayStrCmd = []

  for(let i = 0; i < stkStrCmd.length; i = i + 2){
    const tmp = parseInt('' + stkStrCmd[i] + stkStrCmd[i+1], 16)

    arrayStrCmd.push(tmp)
  }

  return arrayStrCmd
}

export default tlvUtil
