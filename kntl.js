import crypto from 'node:crypto';
import https from 'node:https';

// Config
const EMAIL = 'kagepemalas@gmail.com';
const PASSWORD = 'adamhakimi098';
const DEVICE_ID = 'BnTxAhix/J1O0rfov1awM6G8gxrkPWAcMnFnrBhZ+gkI6GJ1Zec0Q5QSQrvDnkOI7l1Xv5RoG4v3cIEx8JlHPeA==';

let TOKEN = null;
let SESSION_ID = null;
let LAST_CHALLENGE = null;

function solveDeepSeekHashV1(challengeObj) {
  const { algorithm, challenge, salt, difficulty, signature } = challengeObj;
  console.log(`[PoW] Solving... challenge=${challenge.slice(0, 16)}... difficulty=${difficulty}`);
  
  let answer = 0;
  let attempts = 0;
  
  while (true) {
    const input = challenge + salt + answer.toString();
    const hash = crypto.createHash('sha256').update(input).digest('hex');
    
    const hashInt = BigInt('0x' + hash);
    const difficultyInt = BigInt(difficulty);
    const maxHash = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF') / difficultyInt;
    
    if (hashInt < maxHash) {
      console.log(`[PoW] ✓ Solved in ${attempts} attempts`);
      
      // FIX: Include difficulty in the PoW response
      const powResponse = {
        algorithm,
        challenge,
        salt,
        signature,
        difficulty,  // ← ADD THIS
        answer: answer,
        target_path: '/api/v0/chat/completion'
      };
      
      console.log(`[PoW] Full response:`, JSON.stringify(powResponse));
      return powResponse;
    }
    
    answer++;
    attempts++;
    
    if (attempts % 10000 === 0) {
      process.stdout.write(`\r[PoW] Progress: ${attempts} attempts...`);
    }
    
    if (attempts > 10000000) {
      throw new Error('PoW solving timeout');
    }
  }
}

function httpsRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'chat.deepseek.com',
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DeepSeek/2.1.0 Android/35',
        'x-client-platform': 'android',
        'x-client-version': '2.1.0',
        'x-client-locale': 'en_US',
        'x-client-bundle-id': 'com.deepseek.chat',
        'x-rangers-id': '7643771756460658433',
        'x-client-timezone-offset': '28800',
        'accept': 'application/json',
        'accept-charset': 'UTF-8',
        'accept-encoding': 'gzip',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data)
          });
        } catch {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login() {
  console.log('[Login] Starting...');
  
  const body = {
    email: EMAIL,
    password: PASSWORD,
    device_id: DEVICE_ID,
    os: 'android'
  };

  const res = await httpsRequest('POST', '/api/v0/users/login', body);
  
  if (res.status !== 200) {
    throw new Error(`Login failed: ${res.status}`);
  }

  const user = res.body.data?.biz_data?.user;
  if (!user) {
    throw new Error(`Unexpected response`);
  }

  TOKEN = user.token;
  console.log(`[Login] ✓ Token: ${TOKEN.slice(0, 20)}...`);
  
  return TOKEN;
}

async function getCurrentUser() {
  console.log('[User] Fetching...');
  
  const res = await httpsRequest('GET', '/api/v0/users/current', null, {
    'authorization': `Bearer ${TOKEN}`
  });

  console.log(`[User] ✓ ID: ${res.body.data.biz_data.id}`);
  return res.body.data.biz_data;
}

async function createChatSession() {
  console.log('[Session] Creating...');
  
  const res = await httpsRequest('POST', '/api/v0/chat_session/create', {}, {
    'authorization': `Bearer ${TOKEN}`
  });

  const chatSession = res.body.data.biz_data.chat_session;
  SESSION_ID = chatSession.id;
  console.log(`[Session] ✓ ID: ${SESSION_ID}`);
  
  return SESSION_ID;
}

async function getPoWChallenge() {
  console.log('[Challenge] Requesting...');
  
  const res = await httpsRequest('POST', '/api/v0/chat/create_pow_challenge', 
    { target_path: '/api/v0/chat/completion' },
    { 'authorization': `Bearer ${TOKEN}` }
  );

  const challenge = res.body.data.biz_data.challenge;
  console.log(`[Challenge] ✓ Difficulty: ${challenge.difficulty}`);
  
  LAST_CHALLENGE = challenge;
  return challenge;
}

async function chat(message) {
  const challenge = await getPoWChallenge();
  const powResponse = solveDeepSeekHashV1(challenge);

  const body = {
    chat_session_id: SESSION_ID,
    parent_message_id: null,
    prompt: message,
    ref_file_ids: [],
    thinking_enabled: false,
    search_enabled: false,
    audio_id: null,
    preempt: false,
    model_type: 'default'
  };

  const bodyJson = JSON.stringify(body);

  // PoW di-encode ke Base64
  const powJson = JSON.stringify(powResponse);
  const encodedPow = Buffer.from(powJson).toString('base64');
  
  console.log(`[PoW] Sending with header x-ds-pow-response`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'chat.deepseek.com',
      port: 443,
      path: '/api/v0/chat/completion',
      method: 'POST',
      headers: {
        'authorization': `Bearer ${TOKEN}`,
        'x-ds-pow-response': encodedPow,  // ← Ensure lowercase
        'accept': 'text/event-stream',
        'x-client-platform': 'android',
        'x-client-version': '2.1.0',
        'x-client-locale': 'en_US',
        'x-client-bundle-id': 'com.deepseek.chat',
        'x-rangers-id': '7643771756460658433',
        'x-client-timezone-offset': '28800',
        'user-agent': 'DeepSeek/2.1.0 Android/35',
        'accept-charset': 'UTF-8',
        'content-type': 'application/json',
        'content-length': bodyJson.length
      }
    };

    console.log(`[Request] Sending to /api/v0/chat/completion`);

    const req = https.request(options, (res) => {
      console.log(`[Chat] Status: ${res.statusCode}`);

      if (res.statusCode !== 200) {
        let errorData = '';
        res.on('data', chunk => errorData += chunk);
        res.on('end', () => {
          console.error(`[Chat] Error response:`, errorData);
          reject(new Error(`HTTP ${res.statusCode}: ${errorData}`));
        });
        return;
      }

      res.on('data', (chunk) => {
        process.stdout.write(chunk.toString());
      });

      res.on('end', () => {
        console.log(`\n\n[Chat] ✓ Stream ended`);
        resolve();
      });
    });

    req.on('error', reject);
    req.write(bodyJson);
    req.end();
  });
}

async function main() {
  try {
    console.log('====== DeepSeek Bot (Fixed) ======\n');

    await login();
    await getCurrentUser();
    await createChatSession();

    await chat('Halo');

  } catch (err) {
    console.error('[Error]', err.message);
    process.exit(1);
  }
}

main();
