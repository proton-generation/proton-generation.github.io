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
            const baseUrl = 'https://proton-api.vercel.app'
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
        const isAwg = document.getElementById('awg')?.checked || isClash;
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
            awgOptionsYaml += `\n    jc: ${jc}\n    jmin: ${jmin}\n    jmax: ${jmax}\n    s1: 0\n    s2: 0\n    h1: 1\n    h2: 2\n    h3: 3\n    h4: 4`;
        }
        if (isAwg2) {
            if (i1Val) awgOptionsYaml += `\n    i1: ${i1Val}`;
            
            ['i2', 'i3', 'i4', 'i5'].forEach((id) => {
                const val = document.getElementById(id)?.value.trim();
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

    // --- СТАНДАРТНЫЙ ВЫВОД (.conf) ---
    const excludeLan = document.getElementById('switchOption4')?.checked;
    const allowedIPs = excludeLan 
        ? '1.0.0.0/8, 2.0.0.0/7, 4.0.0.0/6, 8.0.0.0/7, 11.0.0.0/8, 12.0.0.0/6, 16.0.0.0/4, 32.0.0.0/3, 64.0.0.0/3, 96.0.0.0/4, 112.0.0.0/5, 120.0.0.0/6, 124.0.0.0/7, 126.0.0.0/8, 128.0.0.0/3, 160.0.0.0/5, 168.0.0.0/8, 169.0.0.0/9, 169.128.0.0/10, 169.192.0.0/11, 169.224.0.0/12, 169.240.0.0/13, 169.248.0.0/14, 169.252.0.0/15, 169.255.0.0/16, 170.0.0.0/7, 172.0.0.0/12, 172.32.0.0/11, 172.64.0.0/10, 172.128.0.0/9, 173.0.0.0/8, 174.0.0.0/7, 176.0.0.0/4, 192.0.0.0/9, 192.128.0.0/11, 192.160.0.0/13, 192.169.0.0/16, 192.170.0.0/15, 192.172.0.0/14, 192.176.0.0/12, 192.192.0.0/10, 193.0.0.0/8, 194.0.0.0/7, 196.0.0.0/6, 200.0.0.0/5, 208.0.0.0/4, 224.0.0.0/4, ::/1, 8000::/2, c000::/3, e000::/4, f000::/5, f800::/6, fe00::/9, fec0::/10, ff00::/8'
        : '0.0.0.0/0, ::/0';

    let peerOptions = '';
    const isKeepalive = document.getElementById('switchOption5')?.checked;
    if (isKeepalive) {
        const pkInput = document.getElementById('keepaliveInput');
        const pkVal = pkInput?.value.trim() || pkInput?.placeholder || '25';
        peerOptions += `\nPersistentKeepalive = ${pkVal}`;
    }

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
        const ext = isClash ? 'yaml' : 'conf';

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
'<b 0xc3000000010828cc76e6712c410c000044d0a2465e075ad0f01564ee338a44a2023493b8e15237b38843001050a4f4bf2a2cfb40695fe5ff42a70c0990053428d982902a32ca57e8b98909370223db26cd729039d5717f730c935603e2a1f7e452ebbeb6236f02198a9e5293322ab2895f935827f58ffe0a2ca638599a6218bc847fd5e1c801cd487cfb10d308156e7ce4c91cf522097cab6d079acc9e7ef18f231ee6ac13f7bd3d03db41dc27953d32d1aaa35932add5b567769a35fc7e3ec9175211afba7b945492b7f2e8b141c450585f09eb9c38a760b4f6fd36257830c47bd028f35ac1b00cbf6c59030d67363e28a8a2e70190a23fbcc10941537db75c01b82f8be3d0ba7fd0f9ab534a36dcefff49ecb9a63d3be1f14ab0376d4f9686fa6478816c183f07179778593821b89a035cfa92ec13c5cd2991180278ed125264fb3a512d0480a73d69218aad3477f2c741981da881a0146002435fd1f15a0c38715396ea6989b4275137f52ea5fd771e9dc0f552755062e21c996b36e97850bf70fce2f98d26837585d28219a7a30d0cc910ff04a920bb69c714c0142193f267d917aab11058f197a6a66cd752aff348d334186bf91a69843f3452b953fc732449c58dc8aa4bcac89aa661f90891da751978f17a62f7b8f847f440f7210dd05574dbd78e4feb4ac478f275f4044c7170f74221abdda3b8fc0c129ae35d3fabac349d81ba9042b4782819ea81665d06691195bd9e7abf6f0e065a092811e9ea5b113207ef06de5768ebe62e8ee94ae4beb5bc4f9996c2c70c7d620da7fedbb2b9709a45584b5ae0fdc1f746b4afc7f100bc2888611b46e2ac243e136bb100e9db3022f472aac8801e77d15960a031e3f8fea5cf8f8703bdb1357800adc802b702c547f4e5f75eb4b6e5eb9327876c77dcfb3baf696a276d6779ab337fc1aa0b03222a6acda0b04a4220f77fd04ce14f083445e55ff88260834582531d759683e1b2d8abc885664cfba1f49f9bdcf26fca845fde45a0ca08a90794cf70338f1031c5098664f10e830d5b3437c7c367c8a0faa16d81471111b616b2f710edfcab27f5f1a7a33daa20ea6e8e5dcd624c6d8f2c048543d025eb970a8eb8aa09c8b4d0be42d6426961a624e37366c21b7e6ca24d09aa3e46a03e3dfc09eafd9d213752b2ca903d11626eb672d5dc116507c6cd2e43f59a6c964937cd9d8f1e54b05f4486c780c46a5718a3baedf93a5cd9b374097bc6db16aa272b6e0a935b35c3f721e206804c45ec5b4a4dadfbb28a9bd08d4a1590f05ef21185c00f8ca250fb31fe549845d39b6ced2e64c00ad5dac27d550313ac778a981a8b5ce2290bb2d90a50717f004d66ff122a395bba9fc67d38bfbfd549389622431afd241ce7a0d755e7016ee37ada01b09e51f4f39aa3785cc162726d23ad98e1f6d1f4346bd221b7401334d89c07e1ede4aec076933ae6d39bddef5d76e7d1fe8053fb1aca8c35d61b60648c5a1487365b0ca365c1689d8fbfc2267f24cbf90474c92be350f5e664b01ef1c8538b25296d643ceed009cb5da29c0a451be67ef626237066946379385f9c79276117598cd462ac0221fe93a46034df330144f9ccfc5d8560e8df7b19849cf7d65b79f21d3f05f61496ac7da3ffaf87b14171cb7e959c3e98fdef862f7cbf9eaebae74b1c9b09d102bff1fc82e0cf32c96b4dcc5cba0d7d3555bc8a5c722965af0c0c2f0dbb24ca1cbde23cfcd39ce86ecffe102f48cf657833fe578e5439>',
'<b 0xce000000010801bb8fd47f76e35a000044d0506fda47bd5feb11d112f0f4faac71f58212d234a6c10dba88715411aa0444f4797e1fcab030a5c527e7c7b8f995357a2adc0300aa89ee67d840dfa49fe175ade73ed5ff4e93a3478a6ac9b7a30aa423852a16bdc005dc1529d1531a7a721bdf9a374c54d0fbd847e4e1ab9b16f59f79bf47c2160493b8a6782ec37e418398fc4db3d2ca4315d4df833144246faa9fea16f41a9f4f71954f16e61c4a9335486044f196e202794dacb39e25cebfa95eb18d9cb576b5ca69062dbf7261b004ff46a36cf8ad32365b3e640c9e7247a4a620c6db308386f9d7ee36fb01fce5ca7dd1e47902c6013e695a3741c28a21af9c57274e009923e7028fc16cfdd3a0f4b2aa647798592271ff17307f629b5ee0b3f874305f1edd0c95ac81a7a965cf39062c70ed36d6e734e6f456266b52a02fa9f8ce4763832f75e6ebad3c75eb61e95e660347e3dcdcb41968370dbd6765ee4f80e020de0725b5847656db58fac5ddc097201f7178fd686020d492c8fe5bbd43d64335047976760c3fdabcc49a6b637660866afba983e657b1a05c64718a15c0599481a7d6ea923eacde9392dce535dde5584dff91b975246bac444972b98f95a54d9a50c94b07aef84cb538c6fd3808205120e6a0b64289a6e3934bc0847712ccf6b76ce725f0899e952c18c0b6743eb629e187a5a2457f1ac700cf7e53616fc239331e09c52265af4219d3bccd203f9af1d14554fc836a12df0076f71d7c7e38233239faf9a1d7ea77a09c602290a186e78ddf379ee353d51a3b12bbd3552362bd2f165a91c5a3e4c5d29f0a38dd295d9c1abbbce33b1a5a105c6fe409c674bac10aacff349229f40c8f27b4332564ae1cfdbf48807ee3d562f8793efa7e81f7dec9640f5a2d1be2d9cff30b7d247abdb4c2a7f5fb5ae24cc884416deac3b4f30b6031c820dd2c378a3b54746416b6963a52c7661953c36a03e96f3d3e039c8d97534f8643b23dea6fb2d57e243011b56e72a25f0872a699cabfc5154f1769888b289d001d108a24097c810be0029af7cf22d5a9ce2b5dd077a6ad46952387113af426f4ae9cfa2c6723d37510d31a9b2b2a3cb013badf5a9eec7337f311a128f3661233d23ee93c4f8677002081dd68be9ec0fd9dabb927bdf73dfb22a3ea670d27a47dd7c12aab429afe9b88b97431104fdd8bcdd7b3663f1e43414ced191d66be0570b3a84e7907aa6a46875364a7df197f10983fe8dc4be8beadba8f670fa58a3dd75c27c66880a1c0dcc947274d6d77113cbf39476d7a3826e491bcf592c30989fe00c00823180c014d0fa2bb535752f2c73bcd8a9e258cff0a5906574d1e710e9e232a9f5d8022b354d25d029fd9c9d7b2e039963b661ce28a1a69b58936fb66398be425ce895c2a1e9d6090bf3e1267a003b30093088d41520b549f03bca5b4ff5ba18b7edb10bb4747a5146aa6a261226736b2c4bb0074fe7a0b3d3af693081d28f014981444728a85f6e0d4aa6566bd748ef8416526e638446806fa36c18558b818517add83a59d442d20bc09dc492cbe563b36e1fa02f218ed6ec650ffe6303b161ab4094d048b2d9cda27a0ebbff818cca884faaa16ab3efbde753b96f672777a58d16322a540a73c74a8611eb64054f7334f33d960726de23fe0e53d564714f085e270d2167a45521aadbdc5fac6192c25559c1f8f9ca66984a29863e1f9f799541484a4f361ee95a7b1e49912d2e538e5016235c8f7d0bc93f5>',
'<b 0xc70000000108df2b1b6970a3feeb000044d0ed2f8959a3b417c660df11a4450acf495f1cc1769fd0a540acbe890d40b5fdca6a2a4e815be972b62c55b5bd0cabf1912e79770f5144aadf2489a8bba6cf68cc4db1d8cec0a6d8e855e3f2a799632d9e705f05a99f09ca1d392de1228e0433f5a56d58772076d1f6c1a91e470a970074b7055425d19244e6eb9757bc10287d0267e02fd2b825a849187f848c89e44b182be8563f5a489d5722b68f7c5c0bc76895f9dff4bd955160001012deb3439dd93fa282df25377e9d00c960b6e48f9ca55f0cc97b4f0d3f034956c9df7fafca1b0c4bd313fe576c4bfecb8205765509ecab8c442a4bd4c483374b9ef328b77caf063ee13db140f7946a3d61e0cb8b083b91991d08db544baff4678b327b015b95db8bc90e28d604d927a1da4392d23093a214ca713e65b66e87d7ffb88664f77167db4ac6560a4ebbee324ff964a9949149782dd5d49594aaddcb752ad1f6eafbb84360175bd9529e1467f53ffbe9044b40e0fee663e8c589893b3ceab34a777e81c5971e88cc923bf0203e6ff2414de93ba98dba342269c6230c2cbf3bd48ea0bfaebf19597957078540122e7c461d151f2a25d7148e2c4f599c95caca321aa02aea7e583b01b07fc89c9e3945fa0ac57d894621197549c4862259981074cf4d077896e676dded2504904f54e291591bcc1118ccb7618ae21b35620c4ec8f8f1a26c1adb5ad9c9b63fbc5795f1997f37ae9ac5467267e7a63e4b21f798b404e78db54d987700550495f2f95529223d7297a4d5857340285624510dbe60276acbb56ec535bb09ce6fe14aa4448d7d1e5b76fb8ae7839c23259d5abb576980dc8ad2b4baf2359c6398452e6615099e87f8b9ca234ee6857713d2319d36020ed040245bd435d50af58216e1a6afb89b1e23240ee6554307475da43962c955eabe87d19f3614c5b60a110da771dd49a47b521af4cf4d4a5e29be93c6c9601c44b6d6c21a750c56c2fec3c9b744ad8496a3fb640ae7ce5a625f78c2d20a38f09cbae8ef0d1e1516470c1bc9bd86ab5596026dda6967a165cc29bd274bc69e5d5250b4c2d77ea79b057083edad33bf94f4f8eb57c6578d987615f3b37b934e18fc6c76d1ce3361ec9aaea32a7acc40bf1939c1e928dbd6b1741486d3b87b37e1c77207f70debee025caa6c4d6605b2b76d42429895f7376230299e644361c6c4ac2769009016192ea88d7cd2fbd2263fe8a19e38edc562fc14cf207128a757a672daf53af301c12d1b2e7ca1ba3305613baa482845253bd7dd0394e8c8bfdfb4227ab7a22112ef2194161a6b92fb7eaadb6974246beee5e578d84182fbcfd24a05d11860a86e445d91cd2fb32c2913100a3657191ff17d6f02a8c554753ed07e9f0a6c944dc380ca3b1fa6a432db7d63c4235e9a473dbfbe09a7a9bc7713a95c9fedc3911ba0caa2f26e981eef132e58b395b904f8542824b7a3af44e40543a0ce227d88abedd936252a6c7f77d4c5d40906e6ff269b3aac3653260da037e65f8fea00d597f3ca9d082a36f07cbc209032b84b975034ea817da90e89bff1ce8b534dc8c3b1f9445454db7411c88bc3804925b3c2b6f7ecddc309d451cd6ade1b716f83990d37c1df0a44bdd9b49eebe8abe5d3294bfc14485e30823cd20cced0c1f4549a8c07e6c2161305ea92a6e45250305bf559f629f325d03e5d6482ea4bf5953ece20514374cda7878c955c51c5c6fd79e053d64e354b8c01858409e2fb928896>',
'<b 0xc0000000010892b06b4ebbca0bc7000044d057c592e23d34c9c3deca7a7cd33a1db8a4f853b48ab16f04e3c7fd20807f9b80954c849cac06879170c668ce2055d423bda127002d560066c2687ff3b688125269defb288ece048019c9812c55fbb016cf95fd73fd428b1f2efdd7e10c174fd1e6757a347214b443105777429c8cddd2e1fc77856fc41cabfc4781eca3027ecd073c7e4dd4e688e47f3d5d4831a37d0059f89bdcf055f11184725db456dcda8d0d3ee0e2f5dd4ce6aa039099e95b8c966210cb35dd4f7437e6e68d64c0d5d33aef8523af522e03de47ea6bb43b8bf1a96fc16ff4fd76d8a4c338f88360f69aed686fd82be98f17abb94ac63a0d9210840a4528ef25f91e7a0d91b6223e9b06b75465c94dd7e28f4194d25bab33ec618813c614a654b9dd420c2729e0202fbaf26e11268b6e50f2287452c3c81dacef3d98db8b7f4144bf70d70f6d72614167509afc874843843cbb73b302997cdafadd41850b0cb99a0b272b06e2c0001e6fda4fee44036b62ce27aea485a39a33c48e0ce97a7977c76d140f7df98b1a1cc46631a905041c76682dd2a8e07ab784f92d44c172d13405c3d87232aa539187c38d82096c17f5ccf76299465be7d25e81cf4bab3092846f158bec336d661cdd232b41b91fb50610e9113bc355dd92e404b7d91b288069397627c723202860658d995e94d4fefc005dda2df80d757aa5bc7a233b4b5807ccf28ebefcf6f70f8c513c55d5e9ff658e51583a0e460724db85b1e61891638817793542d5520a1d2536e08ddda1c11ba28173d7371d0bf6dde4a3aa4b826af64d307d97d471f5665f328af478abc70b8cefc24a0a90a6ed5caae5c4ce25167598600333943731aea8324e985ada2ab7ab1ea428ff8d3ecf8b272690e5b0ea1c5b4aa827b812cc5dd0b970b18ac88061a44255f5f638651ba5286d1decb8596b26f87730cd5de955f54a331f15e0c3edfea2b354e8418ac5c113f9dab98cd3822d7bc72cf29511abcdd56712f270f15419d1bab3b7e4a9320f41849e42b7ce3717c38f3b207867714a808f4f964fd4e51440a607b6efcef650cc7719227376b165e929c382ca943527c66e274ae9da0840b8f91f2d581a92e0c013155b4395f4c459e5e5089f9c3638098763d9485223d96c20e964e5bbec40c6fd920d746539dbca1ffdf1fbdeefa2256e7c8622566bbcfa0b60a573a13b6452e6b7ffe312c43475563fa5227fd50d450c022a6b46fb0f43a432dd84390ee337f6107bde0f4aecf0d58b3be6a5fb2b0e65bea782202f05ff145fb2561cbb29a536cd40bbb9058b673501798484af393423d84756af0a9813ef355c09f3112b80cb785b567aa36d7055a08e475c369c1c750c7c937655486075145863d29424a2442d3ea935e04c21d486d9c476f969dbc862d8e72e50b1c9880703a892f1d78a56ac336ac43e0a73de92bbbbc6d27b15f8ede377a43d39ba6f3c78b68da50a1f12bd8066bb572673210c6971f59af59d7c17245968b7f0d2fe8e9f141aaf99e6de7e0e9208d7a6dc83b9d9846bb0d01684ba9f1c9cdf07698549566466c20fc7cf2c679fc7aedeac59f534cd68e2e9ce7181fd9137f38431e708627101f3bf76a849ba5add5cf33508c8858e0ac587050eaecdf7e479a88eba4cc08d22d0c37cf12ce115eb4ee7a99302692d5cff8446486db739fa5db193a798776f879aabdffe5a3df911f7eb0a7e9b01d1fb7fad1392c9e4be307c329f7120edb4186c457f58>'
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
    const domains = ['apteka.ru', 'psbank.ru', 'lenta.ru', 'www.pochta.ru', 'rzd.ru', 'rutube.ru', 'gosuslugi.ru'];
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
    
    const excludeLan = document.getElementById('switchOption4'); //[cite: 1]
    const persistentKeepalive = document.getElementById('switchOption5'); //[cite: 1]
    const keepaliveInput = document.getElementById('keepaliveInput'); //[cite: 1]

    const label4 = excludeLan?.closest('.switch-label');
    const label5 = persistentKeepalive?.closest('.switch-label');
    
    const track4 = label4?.querySelector('.switch-track');
    const track5 = label5?.querySelector('.switch-track');

    if (isClash) {
        if (excludeLan) {
            excludeLan.disabled = true;
            excludeLan.checked = false; //[cite: 1]
        }
        if (label4) label4.classList.add('opacity-50', 'cursor-not-allowed');
        if (track4) track4.classList.add('cursor-not-allowed');

        if (persistentKeepalive) {
            persistentKeepalive.disabled = true;
            persistentKeepalive.checked = false; //[cite: 1]
        }
        if (label5) label5.classList.add('opacity-50', 'cursor-not-allowed');
        if (track5) track5.classList.add('cursor-not-allowed');

        if (keepaliveInput) {
            keepaliveInput.disabled = true;
            keepaliveInput.classList.add('opacity-50', 'cursor-not-allowed');
        }
    } else {
        if (excludeLan) excludeLan.disabled = false;
        if (label4) label4.classList.remove('opacity-50', 'cursor-not-allowed');
        if (track4) track4.classList.remove('cursor-not-allowed');

        if (persistentKeepalive) persistentKeepalive.disabled = false;
        if (label5) label5.classList.remove('opacity-50', 'cursor-not-allowed');
        if (track5) track5.classList.remove('cursor-not-allowed');

        if (keepaliveInput) {
            keepaliveInput.disabled = false;
            keepaliveInput.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

// Привязываем обработчик к радиокнопкам выбора клиента и вызываем при загрузке[cite: 2]
document.querySelectorAll('input[name="option"]').forEach(radio => {
    radio.addEventListener('change', toggleClashSettings);
});

document.addEventListener('DOMContentLoaded', () => {
    toggleClashSettings();
});