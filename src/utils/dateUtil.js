export function formatExpiry(value) {
  const split = value.match(/..?/g)

  return `${split[1]}/${split[0]}`
}
