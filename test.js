const axios = require('axios');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

(async () => {
  const cookieJar = new tough.CookieJar();
  const client = wrapper(axios.create({
    jar: cookieJar,
    withCredentials: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Referer': 'https://www.playok.com/en/',
    }
  }));

  await cookieJar.setCookie('ref=https://www.playok.com/en/go/; Domain=www.playok.com; Path=/', 'https://www.playok.com');

  const data = new URLSearchParams({
    username: 'cmk',
    pw: 'qw342124',
  }).toString();

  const response = await client.post('https://www.playok.com/en/login.phtml', data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const cookies = await cookieJar.getCookies('https://www.playok.com');
  console.log('Cookies after login:');
  cookies.forEach(c => console.log(`${c.key} = ${c.value}`));

  if (response.data.toLowerCase().includes('log in')) {
    console.log('Login failed or not accepted.');
  } else {
    console.log('Login may be successful.');
  }
})();
