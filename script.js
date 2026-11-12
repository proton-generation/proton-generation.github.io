document.getElementById('telegramButton').onclick = function() {
    window.location.href = 'https://t.me/warp_1_1_1_1';
}

document.getElementById('projectsButton').onclick = function() {
    window.location.href = 'https://my-other-projects.vercel.app/';
}

document.getElementById('adButton').onclick = function() {
    window.location.href = 'https://t.me/AgnosiaVPN_bot'
}

document.getElementById('promoButton').onclick = function() {
    window.location.href = 'https://storage.googleapis.com/amnezia/amnezia.org?m-path=premium&arf=VG755WBZDBAPGGYM';
}

document.getElementById('keepaliveInput')?.addEventListener('input', () => generateConfig());
let currentSession = null;
let serversList = [];
let timerInterval = null;
let serversByCountryCache = {};

document.addEventListener('DOMContentLoaded', () => {
  checkCachedSession();
  initToggles(); 
  initClientToggle();
});

document.getElementById('serverSelect')?.addEventListener('change', () => {
    if (!document.getElementById('step3').classList.contains('hidden')) {
        generateConfig();
    }
});

function checkCachedSession() {
  const cachedSession = localStorage.getItem('protonSession');
  const expires = localStorage.getItem('protonSessionExpires');
  if (cachedSession && expires) {
    const now = new Date().getTime();
    if (now < parseInt(expires)) {
      // Преобразуем сохраненную JSON-строку обратно в объект
                    try {
                        currentSession = JSON.parse(cachedSession);
                    } catch (e) {
                        // Фолбэк на случай, если это была обычная строка
                        currentSession = cachedSession;
                    }
                    
                    startTimer(parseInt(expires));
                    
                    // Загружаем серверы, используя восстановленную сессию
                    fetchAndRenderServers(currentSession).then(() => {
                        showAlert('Сессия восстановлена. Серверы загружены!');
                    }).catch(err => {
                        showAlert('Ошибка при загрузке серверов: ' + err.message, true);
                        clearSession(); // Сбрасываем битую сессию
                    });
                } else {
                    // Время истекло
                    clearSession();
                }
            }
        }

        function showAlert(msg, isError = false) {
            const box = document.getElementById('alertBox');
            box.textContent = msg;
            box.className = `mb-4 p-4 rounded text-sm font-semibold block ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
            setTimeout(() => { box.classList.add('hidden'); }, 5000);
        }

async function apiRequest(endpoint, body = null) {
            const baseUrl = 'https://www.api-proton.workers.dev'
            const headers = { 'Content-Type': 'application/json' };
            const options = {
                method: 'POST', 
                headers: headers
            };
            if (body !== null) options.body = JSON.stringify(body);

            const res = await fetch(`${baseUrl}${endpoint}`, options);
            const data = await res.json();
            
            if (!data.ok) {
                const errorMessage = data.error || 'Произошла неизвестная ошибка (см. консоль)';
                
                // Если API возвращает ошибку токена или авторизации, принудительно сбрасываем сессию
                const lowerError = errorMessage.toLowerCase();
                if (lowerError.includes('token') || lowerError.includes('session') || res.status === 401 || res.status === 403) {
                    // Вызываем clearSession, если она уже загружена
                    if (typeof clearSession === 'function') {
                        clearSession();
                    }
                    // Меняем текст ошибки на более понятный для пользователя
                    throw new Error('Сессия устарела или недействительна. Пожалуйста, подключитесь заново.');
                }
                
                throw new Error(errorMessage);
            }
            
            return data;
        }

function startTimer(expirationTime) {
            const btn = document.getElementById('btnConnect');
            const timerContainer = document.getElementById('timerContainer');
            const timerText = document.getElementById('timerText');
            btn.style.display = 'none';
            timerContainer.classList.remove('hidden');
            timerContainer.classList.add('flex'); 

            if (timerInterval) clearInterval(timerInterval);

            timerInterval = setInterval(() => {
                const now = new Date().getTime();
                const distance = expirationTime - now;

                if (distance <= 0) {
                    clearInterval(timerInterval);
                    clearSession();
                    showAlert('Время сессии истекло. Пожалуйста, подключитесь заново.', true);
                    return;
                }

                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                timerText.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }, 1000);
        }

async function fetchAndRenderServers(session) {
    const serversData = await apiRequest('/api/proton/servers', { session: session });
    serversList = serversData.servers;

    // Группируем серверы
    serversByCountryCache = serversList.reduce((acc, srv) => {
        const country = srv.exitCountry || 'Неизвестно';
        if (!acc[country]) acc[country] = [];
        acc[country].push(srv);
        return acc;
    }, {});

    // Обновляем количество на кнопках
    const countryCount = Object.keys(serversByCountryCache).length;
    const totalCount = serversList.length;

    const btnCountry = document.getElementById('btnDwnlCountry');
    const btnAll = document.getElementById('btnDwnlAll');

    if (btnCountry) btnCountry.textContent = `Скачать .conf файл каждой страны (${countryCount})`;
    if (btnAll) btnAll.textContent = `Скачать все .conf файлы (${totalCount})`;

    // Рендерим фильтры и список
    renderFilterButtons(Object.keys(serversByCountryCache).sort());
    renderServersList('all');

    document.getElementById('step2').classList.remove('hidden');
}

// Рендер радио-фильтров с использованием внешних CSS классов
function renderFilterButtons(countries) {
            const container = document.getElementById('filterContainer');
            container.innerHTML = '';
            
            const filterOptions = ['all', ...countries];

            filterOptions.forEach((country) => {
                const isAll = country === 'all';
                
                const label = document.createElement('label');
                // Присваиваем базовый класс, и active если это выбранный элемент
                label.className = isAll ? 'filter-option active' : 'filter-option';

                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = 'countryFilter';
                radio.value = country;
                radio.className = 'hidden';
                radio.checked = isAll;

                radio.onchange = () => {
                    renderServersList(country);
                    
                    // Убираем класс 'active' у всех остальных
                    container.querySelectorAll('.filter-option').forEach(l => {
                        l.classList.remove('active');
                    });
                    
                    // Добавляем 'active' текущему
                    label.classList.add('active');
                };

                const text = isAll ? '🌍 Все' : `${getFlagEmoji(country)} ${country}`;
                
                label.appendChild(radio);
                label.appendChild(document.createTextNode(text));
                container.appendChild(label);
            });
        }

// Рендер выпадающего списка
function renderServersList(countryFilter) {
            const select = document.getElementById('serverSelect');
            select.innerHTML = '';

            // Определяем, какие страны показывать
            const countriesToShow = (countryFilter === 'all') 
                ? Object.keys(serversByCountryCache).sort() 
                : [countryFilter];

            countriesToShow.forEach(country => {
                const optgroup = document.createElement('optgroup');
                const flag = getFlagEmoji(country);
                optgroup.label = flag ? `${flag} ${country}` : country;

                const servers = serversByCountryCache[country];
                
                // Сортировка по нагрузке
                servers.sort((a, b) => a.load - b.load || a.name.localeCompare(b.name));

                servers.forEach(srv => {
                    const option = document.createElement('option');
                    option.value = srv.id;
                    const cleanName = srv.name.replace('-FREE#', '_');
                    const loadSymbol = getLoadSymbol(srv.load);
                    
                    option.dataset.name = cleanName; 
                    option.textContent = `${loadSymbol} ${cleanName} (${srv.city}) [${srv.load}%]`;
                    optgroup.appendChild(option);
                });

                select.appendChild(optgroup);
            });
            if (!document.getElementById('step3').classList.contains('hidden')) {
                generateConfig();
            }
        }

async function connectProxy() {
            const btn = document.getElementById('btnConnect');
            btn.textContent = 'Загрузка...';
            btn.disabled = true;

            try {
                const sessionData = await apiRequest('/api/proton/session', {});
                currentSession = sessionData.session;
                const expires = new Date().getTime() + 24 * 60 * 60 * 1000;
                localStorage.setItem('protonSession', JSON.stringify(currentSession));
                localStorage.setItem('protonSessionExpires', expires.toString());
                startTimer(expires);
                await fetchAndRenderServers(currentSession);
                showAlert('Успешно подключено. Серверы загружены!');
} catch (error) {
                showAlert(error.message, true);
                console.error(error);
                // Возвращаем кнопку при ошибке через стиль
                btn.style.display = 'block'; 
            } finally {
                btn.textContent = 'Подключиться и получить серверы';
                btn.disabled = false;
            }
        }

// Получение или генерация приватного ключа
async function getOrGeneratePrivateKey() {
    let wgPrivKeyBase64 = localStorage.getItem('wgPrivateKey');
    let cachedCert = localStorage.getItem('protonCertData');

    if (wgPrivKeyBase64 && cachedCert) {
        return wgPrivKeyBase64;
    }

    const seed = nacl.randomBytes(32);
    const edKeyPair = nacl.sign.keyPair.fromSeed(seed);
    const edPubKeyBase64 = nacl.util.encodeBase64(edKeyPair.publicKey);
    const pemPublicKey = `-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA${edPubKeyBase64}\n-----END PUBLIC KEY-----\n`;

    const hash = nacl.hash(seed);
    const wgPrivKey = new Uint8Array(32);
    for (let i = 0; i < 32; i++) wgPrivKey[i] = hash[i];
    wgPrivKey[0] &= 248;
    wgPrivKey[31] &= 127;
    wgPrivKey[31] |= 64;

    wgPrivKeyBase64 = nacl.util.encodeBase64(wgPrivKey);

    const certData = await apiRequest('/api/proton/certificate', {
        session: currentSession,
        clientPublicKey: pemPublicKey,
        persistent: true
    });

    localStorage.setItem('wgPrivateKey', wgPrivKeyBase64);
    localStorage.setItem('protonCertData', JSON.stringify(certData));

    return wgPrivKeyBase64;
}

// Формирование текста конфигурации для любого сервера
function buildConfigString(server, wgPrivKeyBase64) {
    const selectedPort = document.querySelector('input[name="wgPort"]:checked')?.value || '51820';
    const isClash = document.getElementById('clash')?.checked;
	const isXray = document.getElementById('xray')?.checked;
	const mtuInput = document.getElementById('mtu');
    const mtuVal = mtuInput?.value.trim() || mtuInput?.placeholder || '1420';

    // --- AWG 1.0 ---
    const isAwg1 = document.getElementById('switchOption1')?.checked;
    let jc = '', jmin = '', jmax = '';
    let interfaceOptions = '';

    if (isAwg1) {
        jc = '3'; jmin = '1'; jmax = '3';

        if (document.getElementById('junk2')?.checked) {
            jc = '30'; jmin = '10'; jmax = '30';
        } else if (document.getElementById('junk3')?.checked) {
            const jcInput = document.getElementById('jc1');
            const jminInput = document.getElementById('jmin1');
            const jmaxInput = document.getElementById('jmax1');

            jc = jcInput?.value.trim() || jcInput?.placeholder || '128';
            jmin = jminInput?.value.trim() || jminInput?.placeholder || '1279';
            jmax = jmaxInput?.value.trim() || jmaxInput?.placeholder || '1280';
        }

        interfaceOptions += `\nS1 = 0\nS2 = 0\nS3 = 0\nS4 = 0\nJc = ${jc}\nJmin = ${jmin}\nJmax = ${jmax}\nH1 = 1\nH2 = 2\nH3 = 3\nH4 = 4`;
    }

    // --- AWG 2.0 ---
    const isAwg2 = document.getElementById('switchOption2')?.checked;
    let i1Val = '';
    if (isAwg2) {
        const isAwg = document.getElementById('awg')?.checked || isClash || isXray;
        const isWiresock = document.getElementById('wiresock')?.checked;

        if (isAwg) {
            const i1Input = document.getElementById('i1');
            i1Val = i1Input?.value.trim() || '<b 0xce000000010897a297ecc34cd6dd000044d0ec2e2e1ea2991f467ace4222129b5a098823784694b4897b9986ae0b7280135fa85e196d9ad980b150122129ce2a9379531b0fd3e871ca5fdb883c369832f730e272d7b8b74f393f9f0fa43f11e510ecb2219a52984410c204cf875585340c62238e14ad04dff382f2c200e0ee22fe743b9c6b8b043121c5710ec289f471c91ee414fca8b8be8419ae8ce7ffc53837f6ade262891895f3f4cecd31bc93ac5599e18e4f01b472362b8056c3172b513051f8322d1062997ef4a383b01706598d08d48c221d30e74c7ce000cdad36b706b1bf9b0607c32ec4b3203a4ee21ab64df336212b9758280803fcab14933b0e7ee1e04a7becce3e2633f4852585c567894a5f9efe9706a151b615856647e8b7dba69ab357b3982f554549bef9256111b2d67afde0b496f16962d4957ff654232aa9e845b61463908309cfd9de0a6abf5f425f577d7e5f6440652aa8da5f73588e82e9470f3b21b27b28c649506ae1a7f5f15b876f56abc4615f49911549b9bb39dd804fde182bd2dcec0c33bad9b138ca07d4a4a1650a2c2686acea05727e2a78962a840ae428f55627516e73c83dd8893b02358e81b524b4d99fda6df52b3a8d7a5291326e7ac9d773c5b43b8444554ef5aea104a738ed650aa979674bbed38da58ac29d87c29d387d80b526065baeb073ce65f075ccb56e47533aef357dceaa8293a523c5f6f790be90e4731123d3c6152a70576e90b4ab5bc5ead01576c68ab633ff7d36dcde2a0b2c68897e1acfc4d6483aaaeb635dd63c96b2b6a7a2bfe042f6aed82e5363aa850aace12ee3b1a93f30d8ab9537df483152a5527faca21efc9981b304f11fc95336f5b9637b174c5a0659e2b22e159a9fed4b8e93047371175b1d6d9cc8ab745f3b2281537d1c75fb9451871864efa5d184c38c185fd203de206751b92620f7c369e031d2041e152040920ac2c5ab5340bfc9d0561176abf10a147287ea90758575ac6a9f5ac9f390d0d5b23ee12af583383d994e22c0cf42383834bcd3ada1b3825a0664d8f3fb678261d57601ddf94a8a68a7c273a18c08aa99c7ad8c6c42eab67718843597ec9930457359dfdfbce024afc2dcf9348579a57d8d3490b2fa99f278f1c37d87dad9b221acd575192ffae1784f8e60ec7cee4068b6b988f0433d96d6a1b1865f4e155e9fe020279f434f3bf1bd117b717b92f6cd1cc9bea7d45978bcc3f24bda631a36910110a6ec06da35f8966c9279d130347594f13e9e07514fa370754d1424c0a1545c5070ef9fb2acd14233e8a50bfc5978b5bdf8bc1714731f798d21e2004117c61f2989dd44f0cf027b27d4019e81ed4b5c31db347c4a3a4d85048d7093cf16753d7b0d15e078f5c7a5205dc2f87e330a1f716738dce1c6180e9d02869b5546f1c4d2748f8c90d9693cba4e0079297d22fd61402dea32ff0eb69ebd65a5d0b687d87e3a8b2c42b648aa723c7c7daf37abcc4bb85caea2ee8f55bec20e913b3324ab8f5c3304f820d42ad1b9f2ffc1a3af9927136b4419e1e579ab4c2ae3c776d293d397d575df181e6cae0a4ada5d67ecea171cca3288d57c7bbdaee3befe745fb7d634f70386d873b90c4d6c6596bb65af68f9e5121e67ebf0d89d3c909ceedfb32ce9575a7758ff080724e1ab5d5f43074ecb53a479af21ed03d7b6899c36631c0166f9d47e5e1d4528a5d3d3f744029c4b1c190cbfbad06f5f83f7ad0429fa9a2719c56ffe3783460e166de2d8>';
            if (i1Val) interfaceOptions += `\nI1 = ${i1Val}`;

            ['i2', 'i3', 'i4', 'i5'].forEach((id, index) => {
                const val = document.getElementById(id)?.value.trim();
                if (val) interfaceOptions += `\nI${index + 2} = ${val}`;
            });
        } else if (isWiresock) {
            const idVal = document.getElementById('id')?.value || 'apteka.ru';
            const ipVal = document.getElementById('ip')?.value || 'quic';
            const ibVal = document.getElementById('ib')?.value || 'curl';

            if (idVal) interfaceOptions += `\nId = ${idVal}`;
            if (ipVal) interfaceOptions += `\nIp = ${ipVal}`;
            if (ibVal) interfaceOptions += `\nIb = ${ibVal}`;
        }
    }

    // --- AWG 3.0 ---
    const isAwg3 = document.getElementById('switchOption3')?.checked;
    const getValue = (id) => {
        const el = document.getElementById(id);
        return el?.value.trim() || el?.placeholder || '';
    };

    const cpa = isAwg3 ? getValue('cpaInput') : '';
    const rkat = isAwg3 ? getValue('rkatInput') : '';
    const rt = isAwg3 ? getValue('rtInput') : '';
    const rat = isAwg3 ? getValue('ratInput') : '';
    const kt = isAwg3 ? getValue('ktInput') : '';
    const mha = isAwg3 ? getValue('mhaInput') : '';

    if (isAwg3) {
        if (cpa) interfaceOptions += `\nContentPaddingAddition = ${cpa}`;
        if (rkat) interfaceOptions += `\nRekeyAfterTime = ${rkat}`;
        if (rt) interfaceOptions += `\nRekeyTimeout = ${rt}`;
        if (rat) interfaceOptions += `\nRejectAfterTime = ${rat}`;
        if (kt) interfaceOptions += `\nKeepaliveTimeout = ${kt}`;
        if (mha) interfaceOptions += `\nMaxHandshakeAttempts = ${mha}`;
    }

    // --- AWG 3.1 ---
const isAwg31 = document.getElementById('switchOption6')?.checked;
const isRandomTrailers = document.getElementById('switchOption7')?.checked;
const isDisableCookies = document.getElementById('switchOption8')?.checked;

if (isAwg31) {
    if (isRandomTrailers) interfaceOptions += `\nRandomTrailers = on`;
    if (isDisableCookies) interfaceOptions += `\nDisableCookies = on`;
}

    let cleanName = server.name.replace('-FREE#', ' ').replace(/_/g, ' ');
    
    const flag = getFlagEmoji(server.exitCountry);
    if (flag) {
        cleanName = `${flag} ${cleanName}`;
    }

    // --- ВЫВОД ДЛЯ CLASH ---
    if (isClash) {
        let awgOptionsYaml = '';
        if (isAwg1) {
            awgOptionsYaml += `\n    jc: ${jc}\n    jmin: ${jmin}\n    jmax: ${jmax}`;
        }
        if (isAwg2) {
            if (i1Val) awgOptionsYaml += `\n    i1: ${i1Val}`;
            
            ['i2', 'i3', 'i4', 'i5'].forEach((id) => {
                let val = document.getElementById(id)?.value.trim();
                if (val) awgOptionsYaml += `\n    ${id}: ${val}`;
            });
        }
        if (isAwg3) {
            if (cpa) awgOptionsYaml += `\n    content-padding-addition: ${cpa}`;
            if (rkat) awgOptionsYaml += `\n    rekey-after-time: ${rkat}`;
            if (rt) awgOptionsYaml += `\n    rekey-timeout: ${rt}`;
            if (rat) awgOptionsYaml += `\n    reject-after-time: ${rat}`;
            if (kt) awgOptionsYaml += `\n    keepalive-timeout: ${kt}`;
            if (mha) awgOptionsYaml += `\n    max-handshake-attempts: ${mha}`;
        }

		if (isAwg31) {
    if (isRandomTrailers) awgOptionsYaml += `\n    random-trailers: true`;
    if (isDisableCookies) awgOptionsYaml += `\n    disable-cookies: true`;
}

        const amneziaBlock = awgOptionsYaml ? `\n  amnezia-wg-option:${awgOptionsYaml}` : '';

        return `proton: &proton
  type: wireguard
  ip: 10.2.0.2
  ipv6: 2a07:b944::2:2
  private-key: ${wgPrivKeyBase64}
  udp: true
  mtu: ${mtuVal}
  remote-dns-resolve: true
  dns: [10.2.0.1, 2a07:b944::2:1]
  port: ${selectedPort}${amneziaBlock}

proxies:
- name: "${cleanName}"
  <<: *proton
  server: ${server.entryIp}
  public-key: ${server.publicKey}
    
proxy-groups:
- name: ProtonVPN
  type: select
  icon: https://res.cloudinary.com/dbulfrlrz/image/upload/v1703162849/static/logos/icons/vpn_f9embt.svg
  proxies:
    - "${cleanName}"
  url: 'http://speed.cloudflare.com/'
rules:
- MATCH,ProtonVPN`;
    }


    const excludeLan = document.getElementById('switchOption4')?.checked;
    const allowedIPs = excludeLan 
        ? '1.0.0.0/8, 2.0.0.0/7, 4.0.0.0/6, 8.0.0.0/7, 11.0.0.0/8, 12.0.0.0/6, 16.0.0.0/4, 32.0.0.0/3, 64.0.0.0/3, 96.0.0.0/4, 112.0.0.0/5, 120.0.0.0/6, 124.0.0.0/7, 126.0.0.0/8, 128.0.0.0/3, 160.0.0.0/5, 168.0.0.0/8, 169.0.0.0/9, 169.128.0.0/10, 169.192.0.0/11, 169.224.0.0/12, 169.240.0.0/13, 169.248.0.0/14, 169.252.0.0/15, 169.255.0.0/16, 170.0.0.0/7, 172.0.0.0/12, 172.32.0.0/11, 172.64.0.0/10, 172.128.0.0/9, 173.0.0.0/8, 174.0.0.0/7, 176.0.0.0/4, 192.0.0.0/9, 192.128.0.0/11, 192.160.0.0/13, 192.169.0.0/16, 192.170.0.0/15, 192.172.0.0/14, 192.176.0.0/12, 192.192.0.0/10, 193.0.0.0/8, 194.0.0.0/7, 196.0.0.0/6, 200.0.0.0/5, 208.0.0.0/4, 224.0.0.0/4, ::/1, 8000::/2, c000::/3, e000::/4, f000::/5, f800::/6, fe00::/9, fec0::/10, ff00::/8'
        : '0.0.0.0/0, ::/0';

    let peerOptions = '';
	let persistentKeepalive = ''
    const isKeepalive = document.getElementById('switchOption5')?.checked;
    if (isKeepalive) {
        const pkInput = document.getElementById('keepaliveInput');
        const pkVal = pkInput?.value.trim() || pkInput?.placeholder || '25';
        peerOptions += `\nPersistentKeepalive = ${pkVal}`;
		persistentKeepalive = `\n                        "keepAlive": ${pkVal},`;
    }
	
	if (isXray) {
        let awg1 = '';
        if (isAwg1) {
            awg1 = Array.from({ length: jc }, () => `,
                    {
                        "delay": "1-3",
                        "packet": "${jmin}-${jmax}",
                        "type": "rand"
                    }`).join('');
        }
	const match = i1Val.match(/0x([0-9a-fA-F]+)/);
	i1Val = match ? match[1] : '';
	
        return `{
    "dns": {
        "servers": [
            "10.2.0.1",
            "2a07:b944::2:1"
        ]
    },
    "inbounds": [
        {
            "listen": "127.0.0.1",
            "port": 10808,
            "protocol": "socks",
            "settings": {
                "auth": "noauth",
                "udp": true
            },
            "sniffing": {
                "destOverride": [
                    "http",
                    "tls"
                ],
                "enabled": true
            },
            "tag": "socks-in"
        },
        {
            "listen": "127.0.0.1",
            "port": 10809,
            "protocol": "http",
            "settings": {
            },
             "sniffing": {
                "destOverride": [
                    "http",
                    "tls"
                ],
                "enabled": true
            },
            "tag": "http-in"
        }
    ],
    "log": {
        "loglevel": "warning"
    },
    "meta": null,
    "outbounds": [
        {
            "protocol": "wireguard",
            "settings": {
                "address": [
                    "10.2.0.2/32",
                    "2a07:b944::2:2/128"
                ],
                "mtu": ${mtuVal},
                "peers": [
                    {
                        "allowedIPs": [
                            "0.0.0.0/0",
                            "::/0"
                        ],
                        "endpoint": "${server.entryIp}:${selectedPort}",${persistentKeepalive}
                        "publicKey": "${server.publicKey}"
                    }
                ],
                "secretKey": "${wgPrivKeyBase64}"
            },
            "streamSettings": {
                "sockopt": {
                    "dialerProxy": "noise-out"
                }
            },
            "tag": "proton"
        },
        {
            "protocol": "freedom",
            "settings": {
                "domainStrategy": "AsIs",
                "noises": [
                    {
                        "delay": "1-2",
                        "packet": "${i1Val}",
                        "type": "hex"
                    }${awg1}
                ]
            },
            "tag": "noise-out"
        }
    ],
    "remarks": "${cleanName}",
    "routing": {
        "domainStrategy": "AsIs",
        "rules": [
            {
                "network": "tcp,udp",
                "outboundTag": "proton",
                "type": "field"
            }
        ]
    }
}`;
    }
	
    // --- СТАНДАРТНЫЙ ВЫВОД (.conf) ---
    return `[Interface]
PrivateKey = ${wgPrivKeyBase64}
Address = 10.2.0.2/32, 2a07:b944::2:2/128
DNS = 10.2.0.1, 2a07:b944::2:1
MTU = ${mtuVal}${interfaceOptions}

[Peer]
# Server: ${server.name}
PublicKey = ${server.publicKey}
Endpoint = ${server.entryIp}:${selectedPort}
AllowedIPs = ${allowedIPs}${peerOptions}`;
}

async function generateConfig() {
    const btn = document.getElementById('btnGenerate');
    btn.textContent = 'Генерация...';
    btn.disabled = true;

    try {
        // 1. Получаем/генерируем приватный ключ WireGuard
        const wgPrivKeyBase64 = await getOrGeneratePrivateKey();

        // 2. Находим выбранный сервер из списка
        const serverId = document.getElementById('serverSelect').value;
        const server = serversList.find(s => s.id === serverId);

        if (!server) {
            throw new Error('Выбранный сервер не найден');
        }

        // 3. Собираем текст конфигурации
        const configStr = buildConfigString(server, wgPrivKeyBase64);

        // 4. Помещаем в поле текста и отображаем 3-й шаг
        document.getElementById('wgConfigText').value = configStr;

        const step3 = document.getElementById('step3');
        const wasHidden = step3.classList.contains('hidden');
        step3.classList.remove('hidden');

        // Уведомление показываем только при первой генерации
        if (wasHidden) {
            showAlert('Конфигурация успешно создана');
        }
    } catch (error) {
        showAlert(error.message, true);
        console.error(error);
    } finally {
        btn.textContent = 'Сгенерировать конфиг';
        btn.disabled = false;
    }
}

function clearSession() {
    localStorage.removeItem('protonSession');
    localStorage.removeItem('protonSessionExpires');
    
    // Очищаем кэш ключей и сертификатов
    localStorage.removeItem('wgPrivateKey'); 
    localStorage.removeItem('protonCertData'); 
    localStorage.removeItem('wgSeed'); // Оставлено на случай миграции со старой версии
    
    currentSession = null;
    
    if (timerInterval) clearInterval(timerInterval);
    
    const btn = document.getElementById('btnConnect');
    const timerContainer = document.getElementById('timerContainer');
    
    if (btn) btn.style.display = 'block';
    if (timerContainer) {
        timerContainer.classList.add('hidden');
        timerContainer.classList.remove('flex');
    }
    
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.add('hidden');
}

function downloadConfig() {
    const text = document.getElementById('wgConfigText').value;
    const select = document.getElementById('serverSelect');
    const selectedOption = select.options[select.selectedIndex];
    const isClash = document.getElementById('clash')?.checked;
    
    const serverName = selectedOption.dataset.name || selectedOption.value;
    const ext = isClash ? 'yaml' : 'conf';
    
    const blob = new Blob([text], { type: 'application/x-config; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serverName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Скачивание конфига с минимальной нагрузкой по каждой стране
async function downloadCountriesZip() {
    const btn = document.getElementById('btnDwnlCountry');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Создание ZIP...';

    try {
        const privKey = await getOrGeneratePrivateKey();
        const zip = new JSZip();
        
        const isClash = document.getElementById('clash')?.checked;
        const ext = isClash ? 'yaml' : 'conf';

        Object.keys(serversByCountryCache).forEach(country => {
            const servers = [...serversByCountryCache[country]];
            // Сортируем по наименьшей нагрузке
            servers.sort((a, b) => a.load - b.load || a.name.localeCompare(b.name));
            const bestServer = servers[0];

            if (bestServer) {
                // Имя файла остается в безопасном формате с подчеркиванием
                const fileName = bestServer.name.replace('-FREE#', '_');
                const configText = buildConfigString(bestServer, privKey);
                zip.file(`${fileName}.${ext}`, configText);
            }
        });

        const content = await zip.generateAsync({ type: 'blob' });
        saveBlobAsFile(content, 'ProtonVPN_Countries.zip');
    } catch (error) {
        showAlert('Ошибка при создании архива: ' + error.message, true);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Скачивание всех доступных конфигов
async function downloadAllZip() {
    const btn = document.getElementById('btnDwnlAll');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Создание ZIP...';

    try {
        const privKey = await getOrGeneratePrivateKey();
        const zip = new JSZip();

        const isClash = document.getElementById('clash')?.checked;
		const isXray = document.getElementById('xray')?.checked;
        let ext = 'conf';
		if (isXray) {ext = 'json'} else if (isClash) {ext = 'yaml'}

        serversList.forEach(server => {
            // Имя файла остается в безопасном формате с подчеркиванием
            const fileName = server.name.replace('-FREE#', '_');
            const configText = buildConfigString(server, privKey);
            zip.file(`${fileName}.${ext}`, configText);
        });

        const content = await zip.generateAsync({ type: 'blob' });
        saveBlobAsFile(content, 'ProtonVPN_All.zip');
    } catch (error) {
        showAlert('Ошибка при создании архива: ' + error.message, true);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Вспомогательное скачивание Blob-файлов
function saveBlobAsFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Эмодзи флага из двухбуквенного кода страны
function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

// Индикатор нагрузки
function getLoadSymbol(load) {
    if (load < 30) return '🟢'; 
    if (load < 60) return '🟡'; 
    if (load < 90) return '🟠'; 
    return '🔴';                
}

function initToggles() {
    const switch1 = document.getElementById('switchOption1');
    const switch2 = document.getElementById('switchOption2');
    const switch3 = document.getElementById('switchOption3');
    const switch4 = document.getElementById('switchOption6');

    const updateVisibility = () => {
        document.querySelectorAll('.musor1').forEach(el => {
            el.style.display = switch1 && switch1.checked ? '' : 'none';
        });
        document.querySelectorAll('.musor2').forEach(el => {
            el.style.display = switch2 && switch2.checked ? '' : 'none';
        });
        document.querySelectorAll('.musor3').forEach(el => {
            el.style.display = switch3 && switch3.checked ? 'grid' : 'none';
        });
		document.querySelectorAll('.musor4').forEach(el => {
            el.style.display = switch4 && switch4.checked ? '' : 'none';
        });
    };

    updateVisibility();

    if (switch1) switch1.addEventListener('change', updateVisibility);
    if (switch2) switch2.addEventListener('change', updateVisibility);
    if (switch3) switch3.addEventListener('change', updateVisibility);
    if (switch4) switch4.addEventListener('change', updateVisibility);
    document.querySelectorAll('input[name="junk"]').forEach(radio => {
        radio.addEventListener('change', () => generateConfig());
    });
    ['mtu', 'jc1', 'jmin1', 'jmax1', 'cpaInput', 'mhaInput', 'ktInput', 'ratInput', 'rkatInput', 'rtInput'].forEach(id => {document.getElementById(id)?.addEventListener('input', () => generateConfig());});

	['i1', 'i2', 'i3', 'i4', 'i5', 'id', 'ip', 'ib'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => generateConfig());
    document.getElementById(id)?.addEventListener('change', () => generateConfig());});
   ['switchOption7', 'switchOption8'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => generateConfig());
});
}

function initClientToggle() {
    const optionRadios = document.querySelectorAll('input[name="option"]');
    const wireSockDiv = document.getElementById('WireSockdiv');
    const awgDiv = document.getElementById('awgdiv');

    if (!wireSockDiv || !awgDiv) return;

    const updateVisibility = () => {
        const isWiresock = document.getElementById('wiresock')?.checked;

        wireSockDiv.classList.toggle('hidden', !isWiresock);
        awgDiv.classList.toggle('hidden', isWiresock);

        // Если сгенерированный конфиг уже отображается (шаг 3), сразу пересоздаем его
        if (!document.getElementById('step3').classList.contains('hidden')) {
            generateConfig();
        }
    };

    optionRadios.forEach(radio => radio.addEventListener('change', updateVisibility));
    updateVisibility();
}

function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

// Случайно AWG 1.0
function randomizeAwg1() {
    const junk3 = document.getElementById('junk3');
    if (junk3) junk3.checked = true;
    const jc = getRandomInt(1, 100);
    const jmin = getRandomInt(1, 200);
    const jmax = getRandomInt(jmin + 1, 201);
    const jcInput = document.getElementById('jc1');
    const jminInput = document.getElementById('jmin1');
    const jmaxInput = document.getElementById('jmax1');
    if (jcInput) jcInput.value = jc;
    if (jminInput) jminInput.value = jmin;
    if (jmaxInput) jmaxInput.value = jmax;
    if (!document.getElementById('step3').classList.contains('hidden')) {
        generateConfig();
    }
}

// Случайно AWG 2.0
function randomizeAwg2() {
    const i1List = [
'<b 0xce000000010897a297ecc34cd6dd000044d0ec2e2e1ea2991f467ace4222129b5a098823784694b4897b9986ae0b7280135fa85e196d9ad980b150122129ce2a9379531b0fd3e871ca5fdb883c369832f730e272d7b8b74f393f9f0fa43f11e510ecb2219a52984410c204cf875585340c62238e14ad04dff382f2c200e0ee22fe743b9c6b8b043121c5710ec289f471c91ee414fca8b8be8419ae8ce7ffc53837f6ade262891895f3f4cecd31bc93ac5599e18e4f01b472362b8056c3172b513051f8322d1062997ef4a383b01706598d08d48c221d30e74c7ce000cdad36b706b1bf9b0607c32ec4b3203a4ee21ab64df336212b9758280803fcab14933b0e7ee1e04a7becce3e2633f4852585c567894a5f9efe9706a151b615856647e8b7dba69ab357b3982f554549bef9256111b2d67afde0b496f16962d4957ff654232aa9e845b61463908309cfd9de0a6abf5f425f577d7e5f6440652aa8da5f73588e82e9470f3b21b27b28c649506ae1a7f5f15b876f56abc4615f49911549b9bb39dd804fde182bd2dcec0c33bad9b138ca07d4a4a1650a2c2686acea05727e2a78962a840ae428f55627516e73c83dd8893b02358e81b524b4d99fda6df52b3a8d7a5291326e7ac9d773c5b43b8444554ef5aea104a738ed650aa979674bbed38da58ac29d87c29d387d80b526065baeb073ce65f075ccb56e47533aef357dceaa8293a523c5f6f790be90e4731123d3c6152a70576e90b4ab5bc5ead01576c68ab633ff7d36dcde2a0b2c68897e1acfc4d6483aaaeb635dd63c96b2b6a7a2bfe042f6aed82e5363aa850aace12ee3b1a93f30d8ab9537df483152a5527faca21efc9981b304f11fc95336f5b9637b174c5a0659e2b22e159a9fed4b8e93047371175b1d6d9cc8ab745f3b2281537d1c75fb9451871864efa5d184c38c185fd203de206751b92620f7c369e031d2041e152040920ac2c5ab5340bfc9d0561176abf10a147287ea90758575ac6a9f5ac9f390d0d5b23ee12af583383d994e22c0cf42383834bcd3ada1b3825a0664d8f3fb678261d57601ddf94a8a68a7c273a18c08aa99c7ad8c6c42eab67718843597ec9930457359dfdfbce024afc2dcf9348579a57d8d3490b2fa99f278f1c37d87dad9b221acd575192ffae1784f8e60ec7cee4068b6b988f0433d96d6a1b1865f4e155e9fe020279f434f3bf1bd117b717b92f6cd1cc9bea7d45978bcc3f24bda631a36910110a6ec06da35f8966c9279d130347594f13e9e07514fa370754d1424c0a1545c5070ef9fb2acd14233e8a50bfc5978b5bdf8bc1714731f798d21e2004117c61f2989dd44f0cf027b27d4019e81ed4b5c31db347c4a3a4d85048d7093cf16753d7b0d15e078f5c7a5205dc2f87e330a1f716738dce1c6180e9d02869b5546f1c4d2748f8c90d9693cba4e0079297d22fd61402dea32ff0eb69ebd65a5d0b687d87e3a8b2c42b648aa723c7c7daf37abcc4bb85caea2ee8f55bec20e913b3324ab8f5c3304f820d42ad1b9f2ffc1a3af9927136b4419e1e579ab4c2ae3c776d293d397d575df181e6cae0a4ada5d67ecea171cca3288d57c7bbdaee3befe745fb7d634f70386d873b90c4d6c6596bb65af68f9e5121e67ebf0d89d3c909ceedfb32ce9575a7758ff080724e1ab5d5f43074ecb53a479af21ed03d7b6899c36631c0166f9d47e5e1d4528a5d3d3f744029c4b1c190cbfbad06f5f83f7ad0429fa9a2719c56ffe3783460e166de2d8>',
'<b 0xca000000010192000040523d20151ea578688a48502d1b7d5ae46906ceb14547fec9aee98a407dab61b229ca5f6707be89c159f3cf9b73a3b8d906f7d3e307f8e39fdb0d35b23c0ffc635d285418cea8bfd98009d234e0e4f95891a7f4>',
'<b 0xcd00000001019500004050389e9d50b54adf3d7b201298e06ddc84decc476cbaae7f5caa99df689a3d8bc8cdf4f1d328ca82147d4afbcd607f76c4ec72dcfa3831afb10b2469557a604f9bfc70d78c149fc6fbc2217d7b1ff6166e>',
'<b 0xc400000001015c000040570b2e25e1a2fb2e1d5cf2bfdaeb0ca79c3255f6384628e6e6c22adb43440db63fa1d26ad16120d9cbdbf0dc2f7a8eb3525561b193c6b6a0ef44e8d118c3b04a3ae880c081a9b9e97321315915787938abd8b925506b830d>',
'<b 0xc70000000101eb00004055988000e4d3995e7951b41d23dbb150e211e82942d2acbfc4b0596a070887a0e75c6e9e125b838da7e42a511b381741c47bb784a497a0a47327046ce4e2007d611c6c119779f0f2e340d5d6c4525a87754d7c997c09>',
'<b >'
    ];

    const randomIndex = Math.floor(Math.random() * i1List.length);
    const i1Input = document.getElementById('i1');
    if (i1Input) {
        i1Input.value = i1List[randomIndex];
    }
    if (!document.getElementById('step3').classList.contains('hidden')) {
        generateConfig();
    }
}
function randomizeWireSock() {
const domains = [
    '175bru.ru',
    '1tv.ru',
    '2an.ru',
    '2gis.ru',
    '360tv.ru',
    '4ege.ru',
    '5-tv.ru',
    '9111.ru',
    'akbars.ru',
    'allhockey.ru',
    'amalgama-lab.com',
    'apteka.ru',
    'aptekamos.ru',
    'arbitr.ru',
    'arhangelskoe.su',
    'artchive.ru',
    'arzamas.academy',
    'asna.ru',
    'ati.su',
    'autonews.ru',
    'av.ru',
    'avtovzglyad.ru',
    'baby.ru',
    'babyblog.ru',
    'bashinform.ru',
    'bbr.ru',
    'beeline.ru',
    'belkacar.ru',
    'blizko.ru',
    'bolshoi.ru',
    'borodino.ru',
    'bspb.ru',
    'c2dns.net',
    'c2dns.ru',
    'cdek.ru',
    'championat.com',
    'chitalnya.ru',
    'consmed.ru',
    'consultant.ru',
    'cosmo.ru',
    'ctc.ru',
    'culture.ru',
    'dalenabank.ru',
    'datalesson.ru',
    'deepseek.com',
    'delimobil.ru',
    'delivery-club.ru',
    'dellin.ru',
    'dixy.ru',
    'dnevnik.ru',
    'dns-shop.ru',
    'docdoc.ru',
    'doctis.ru',
    'domashniy.ru',
    'doverie-tv.ru',
    'dzen.ru',
    'e-katalog.ru',
    'eapteka.ru',
    'edadeal.ru',
    'edimdoma.ru',
    'edu.ru',
    'elibrary.ru',
    'f1news.ru',
    'fantlab.ru',
    'fedsfm.ru',
    'fighttime.ru',
    'filmpro.ru',
    'fipi.ru',
    'fips.ru',
    'fitseven.ru',
    'forumhouse.ru',
    'foxford.ru',
    'friday.ru',
    'fsb.ru',
    'fss.ru',
    'fssprus.ru',
    'garant.ru',
    'gaso.ru',
    'gismeteo.ru',
    'gks.ru',
    'gosfilmofond.ru',
    'goskatalog.ru',
    'habr.ru',
    'health-diet.ru',
    'hermitagemuseum.org',
    'hi-news.ru',
    'histrf.ru',
    'ilibrary.ru',
    'in-space.ru',
    'indicator.ru',
    'infourok.ru',
    'interneturok.ru',
    'invb.ru',
    'irecommend.ru',
    'is74.ru',
    'ivi.ru',
    'joomag.com',
    'jv.ru',
    'karcher.ru',
    'kartaslov.ru',
    'karusel-tv.ru',
    'khl.ru',
    'kinopoisk.ru',
    'knigogid.ru',
    'kodeks.ru',
    'kolesa.ru',
    'kommersant.ru',
    'kopilkaurokov.ru',
    'kp.ru',
    'kreml.ru',
    'lektorium.tv',
    'letidor.ru',
    'lib.ru',
	'linkgroup.ru',
    'litres.ru',
    'livejournal.com',
    'livelib.ru',
    'livesport.ru',
    'lizaalert.org',
    'm24.ru',
    'maam.ru',
    'magnit.ru',
    'mail.ru',
    'mariinsky.ru',
    'matchtv.ru',
    'med-otzyv.ru',
    'medi.ru',
    'mediametrics.ru',
    'medicalinsider.ru',
    'medihost.ru',
    'medikforum.ru',
    'medlinks.ru',
    'medportal.ru',
    'medside.ru',
    'megafon.ru',
    'mel.fm',
    'mirtesen.ru',
    'mirtv.ru',
    'mkala.ru',
    'mob-edu.ru',
    'moluch.ru',
    'moskb.ru',
    'mts.ru',
    'multiurok.ru',
    'mybook.ru',
    'myskills.ru',
    'naked-science.ru',
    'nat-geo.ru',
    'nauchniestati.ru',
    'netology.ru',
    'nevasport.ru',
    'nic.ru',
    'nkj.ru',
    'nplus1.ru',
    'nskbl.ru',
    'nsportal.ru',
    'ntv.ru',
    'nukadeti.ru',
    'obrazovaka.ru',
    'ohotniki.ru',
    'olimpiada.ru',
    'onlinedoctor.ru',
    'onlinetrade.ru',
    'oprf.ru',
    'otr-online.ru',
    'otzovik.com',
    'oum.ru',
    'ped-kopilka.ru',
    'pedsovet.org',
    'pervbank.ru',
    'pikabu.ru',
    'pochtabank.ru',
    'popmech.ru',
    'postupi.online',
    'povar.ru',
    'professionali.ru',
    'profi.ru',
    'proza.ru',
    'psbank.ru',
    'pypi.org',
    'radiomayak.ru',
    'radiorus.ru',
    'radiovesti.ru',
    'rbc.ru',
    'ren.tv',
    'rgo.ru',
    'ria.ru',
    'rlsnet.ru',
    'rosbank.ru',
    'rosreestr.ru',
    'rosuchebnik.ru',
    'rsl.ru',
    'rt.ru',
    'rulit.me',
    'rusarchives.ru',
    'rusmuseum.ru',
    'rusneb.ru',
    'russkiiyazyk.ru',
    'rustih.ru',
    'rutube.ru',
    'samlib.ru',
    'sdamgia.ru',
    'selfpub.ru',
    'shm.ru',
    'sirius.online',
    'skyeng.ru',
    'sledcom.ru',
    'sm-news.ru',
    'smi2.ru',
    'smotrim.ru',
    'soccer.ru',
    'sovcombank.ru',
    'sovsport.ru',
    'spastv.ru',
    'sport24.ru',
    'sportmail.ru',
    'sportrbc.ru',
    'sportsdaily.ru',
    'stihi.ru',
    'sudact.ru',
    'sudrf.ru',
    'tamtam.chat',
    'tatar-inform.ru',
    'tele2.ru',
    'teleprogramma.pro',
    'tiu.ru',
    'tnt-online.ru',
    'tretyakovgallery.ru',
    'trudvsem.ru',
    'tv3.ru',
    'tvc.ru',
    'tvkultura.ru',
    'tvzvezda.ru',
    'ucheba.ru',
    'uchi.ru',
    'uchportal.ru',
    'unicreditbank.ru',
    'ura.news',
    'uteka.ru',
    'utkonos.ru',
    'vbr.ru',
    'verumreactor.ru',
    'vesti.ru',
    'vgtrk.ru',
    'videouroki.net',
    'vitrina.tv',
    'vk.ru',
    'vkvideo.ru',
    'vm.ru',
    'vokrugsveta.ru',
    'vrachirf.ru',
    'vsrf.ru',
    'webinar.ru',
    'wi-fi.ru',
    'wikireading.ru',
    'woman.ru',
    'worldskills.ru',
    'xn--80aesfpebagmfblc0a.xn--p1ai',
    'xn--80afcdbalict6afooklqi5o.xn--p1ai',
    'xn--j1ahfl.xn--p1ai',
    'xn----7sbb5adknde1cb0dyd.xn--p1ai',
    'xn--2020-f4dsa7cb5cl7h.xn--p1ai',
    'yaklass.ru',
    'youdo.com',
    'youla.ru',
    'zakon.ru',
    'zdorovie.ru',
    'zdorovieinfo.ru',
    'znaika.ru',
    'zoon.ru'];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];

    const idInput = document.getElementById('id');
    if (idInput) {
        idInput.value = randomDomain;
    }

    // Автоматически перегенерируем конфиг, если блок результатов уже показан
    if (!document.getElementById('step3').classList.contains('hidden')) {
        generateConfig();
    }
}

// Случайно AWG 3.0
function randomizeAwg3() {
    const getRandomRange = (minLow, minHigh, maxLow, maxHigh) => {
        const min = Math.floor(Math.random() * (minHigh - minLow + 1)) + minLow;
        const max = Math.floor(Math.random() * (maxHigh - maxLow + 1)) + maxLow;
        return `${min}-${max}`;
    };

    const cpa = document.getElementById('cpaInput');
    const mha = document.getElementById('mhaInput');
    const kt = document.getElementById('ktInput');
    const rat = document.getElementById('ratInput');
    const rkat = document.getElementById('rkatInput');
    const rt = document.getElementById('rtInput');

    if (cpa) cpa.value = getRandomRange(5, 49, 50, 110);    
    if (mha) mha.value = getRandomRange(5, 24, 25, 40);      
    if (kt) kt.value = getRandomRange(5, 10, 11, 25);       
    if (rat) rat.value = getRandomRange(50, 99, 100, 200);  
    if (rkat) rkat.value = getRandomRange(50, 99, 100, 150); 
    if (rt) rt.value = getRandomRange(3, 9, 10, 15);           

    if (!document.getElementById('step3').classList.contains('hidden')) {
        generateConfig();
    }
}

// Подтверждение если нажата клавиша Enter без Shift
document.addEventListener('DOMContentLoaded', function() {

const textareas = document.querySelectorAll('.jc');
    
    textareas.forEach(textarea => {
        textarea.addEventListener('keydown', function(e) {       
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.blur();
            }
        });
    });
});

// Открытие modal
document.querySelector('.genbtn')?.addEventListener('click', function() {
    const modal = document.getElementById('Modal');
    if (modal) {
        modal.style.display = 'block';
    }
});

// Закрытие модального окна при клике на крестик
function closeModal() {
    const modal = document.getElementById('Modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Закрытие модального окна при клике вне его области
window.addEventListener('click', function(event) {
    const modal = document.getElementById('Modal');
    if (modal && event.target === modal) {
        modal.style.display = 'none';
    }
});

// Обработчик для кнопки подтверждения в модальном окне
const selectDomainBtn = document.getElementById('selectDomain');
if (selectDomainBtn) {
    selectDomainBtn.addEventListener('click', async function() {
    const domainInput = document.getElementById('domain');
    const domain = domainInput.value.trim();
    
    if (domain) {
        const i1 = await generateI1FromDomain(domain);
		document.getElementById('i1').value = i1;
        closeModal();
        generateConfig();
		
    } else {
        alert('Пожалуйста, введите домен');
    }
});
}

function toggleClashSettings() {
    const isClash = document.getElementById('clash')?.checked;
    const isXray = document.getElementById('xray')?.checked;
	
    const awg3 = document.getElementById('switchOption3');
    const excludeLan = document.getElementById('switchOption4');
    const persistentKeepalive = document.getElementById('switchOption5');
	const awg31 = document.getElementById('switchOption6');
    const keepaliveInput = document.getElementById('keepaliveInput');
	const i2_5 = document.getElementById('i2-5');

    const label3 = awg3?.closest('.switch-label');
    const label4 = excludeLan?.closest('.switch-label');
    const label5 = persistentKeepalive?.closest('.switch-label');
    const label6 = awg31?.closest('.switch-label');
	
	const track3 = label3?.querySelector('.switch-track');
    const track4 = label4?.querySelector('.switch-track');
    const track5 = label5?.querySelector('.switch-track');
	const track6 = label6?.querySelector('.switch-track');

    if (isClash) {
		excludeLan.disabled = true;
		excludeLan.checked = false;
		label4.classList.add('opacity-50', 'cursor-not-allowed');
		track4.classList.add('cursor-not-allowed');

		persistentKeepalive.disabled = true;
		persistentKeepalive.checked = false;
		label5.classList.add('opacity-50', 'cursor-not-allowed');
		track5.classList.add('cursor-not-allowed');

		keepaliveInput.disabled = true;
		keepaliveInput.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
		excludeLan.disabled = false;
		label4.classList.remove('opacity-50', 'cursor-not-allowed');
		track4.classList.remove('cursor-not-allowed');

		persistentKeepalive.disabled = false;
		label5.classList.remove('opacity-50', 'cursor-not-allowed');
		track5.classList.remove('cursor-not-allowed');

		keepaliveInput.disabled = false;
		keepaliveInput.classList.remove('opacity-50', 'cursor-not-allowed');
        }
   
	
	if (isXray) {
		const jcInput = document.getElementById('jc1');
		const jminInput = document.getElementById('jmin1');
		const jmaxInput = document.getElementById('jmax1');
		const radio = document.getElementById('junk3');

		radio.checked = true;
		jcInput.value = 5
		jminInput.value = 40
		jmaxInput.value = 70

		excludeLan.disabled = true;
		excludeLan.checked = false;
		label4.classList.add('opacity-50', 'cursor-not-allowed');
		track4.classList.add('cursor-not-allowed');
		
		awg3.disabled = true;
		awg3.checked = false;
		label3.classList.add('opacity-50', 'cursor-not-allowed');
		track3.classList.add('cursor-not-allowed');
		
		awg31.disabled = true;
		awg31.checked = false;
		label6.classList.add('opacity-50', 'cursor-not-allowed');
		track6.classList.add('cursor-not-allowed');
		
		i2_5.classList.add('opacity-50', 'cursor-not-allowed');
		i2_5.style.pointerEvents = 'none';
	} else {
		excludeLan.disabled = false;
		label4.classList.remove('opacity-50', 'cursor-not-allowed');
		track4.classList.remove('cursor-not-allowed');
		
		awg3.disabled = false;
		label3.classList.remove('opacity-50', 'cursor-not-allowed');
		track3.classList.remove('cursor-not-allowed');

		awg31.disabled = false;
		label6.classList.remove('opacity-50', 'cursor-not-allowed');
		track6.classList.remove('cursor-not-allowed');
		
		i2_5.classList.remove('opacity-50', 'cursor-not-allowed');
		i2_5.style.pointerEvents = '';
        }
}

// Привязываем обработчик к радиокнопкам выбора клиента и вызываем при загрузке[cite: 2]
document.querySelectorAll('input[name="option"]').forEach(radio => {
    radio.addEventListener('change', toggleClashSettings);
});

document.addEventListener('DOMContentLoaded', () => {
    toggleClashSettings();
});
