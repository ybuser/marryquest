const encodeQuery = (venueName: string, address: string) => encodeURIComponent(`${venueName} ${address}`.trim());

export function buildMapLinks(venueName: string, address: string) {
  const query = encodeQuery(venueName, address);

  return {
    naver: `https://map.naver.com/v5/search/${query}`,
    kakao: `https://map.kakao.com/link/search/${query}`,
    google: `https://www.google.com/maps/search/?api=1&query=${query}`
  } as const;
}
