declare var SP: any

export function getSPByteArrayFromArrayBuffer(arrayBuffer: any): any {
  const length = arrayBuffer.byteLength
  const bufferView = new Uint8Array(arrayBuffer)
  const spByteArray = new SP.Base64EncodedByteArray()

  for (let i = 0; i < length; i++) {
    spByteArray.append(bufferView[i])
  }

  return spByteArray
}

export function fromLookup(field) {

  if (field) {

    const lookup = {
      id: field.get_lookupId(),
      title: field.get_lookupValue()
    }
    return lookup
  } else {
    return {
      id: null,
      title: null

    }
  }
}

export function fromUser(field) {

  if (field) {

    const lookup = {
      id: field.get_lookupId(),
      title: field.get_lookupValue(),
      username: field.get_lookupId(),
      name: field.get_lookupValue(),
      email: field.get_email(),
      phone: null,
    }
    return lookup
  } else {
    return {
      id: null,
      title: null,
      username: null,
      name: null,
      email: null,
      phone: null,
    }
  }
}

export function idFromLookup(field) {
  if (field) {
    return field.get_lookupId()
  } else {
    return null
  }
}
