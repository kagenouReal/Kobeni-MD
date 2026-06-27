import crypto from "node:crypto";
import axios from "axios";

class TakoClient {
  constructor() {
    this.cookies = {
      'store-idc': 'alisg',
      'store-country-code': 'my',
      'install_id': '7623820063082530568',
      'ttreq': '1$a3f3f758cc03929c624428a987ee530366ce42a5',
      'sid_guard': '69bad22b4d6edfbd8cbce9ec82ae70fe%7C1782573726%7C15551999%7CThu%2C+24-Dec-2026+15%3A22%3A05+GMT',
      'sid_tt': '69bad22b4d6edfbd8cbce9ec82ae70fe',
      'sessionid': '69bad22b4d6edfbd8cbce9ec82ae70fe',
      'sessionid_ss': '69bad22b4d6edfbd8cbce9ec82ae70fe',
      'odin_tt': 'b5b3e0269d04a7717014e670dc8ee483e982976961a0ac8d6659ceb1e8a78103690acdb87c2d0ab3cdce998452ed6d62c55c38e598d4b3e140ea1eeb7dcff0299795ff509a35ad019fd8e143a9310ddf'
    };
  }

  // Cleanup text dari HTML tags dan markdown artifacts

  cleanText(text) {
    if (!text) return text;
    
    return text
      // Hapus semua tag HTML/custom (sup, data-inline, data-collection, dll)
      .replace(/<[^>]+>/gs, '')
      // Hapus tag self-closing dengan content
      .replace(/<data-\w+[^>]*>.*?<\/data-\w+>/gs, '')
      // Decode HTML entities
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'")
      // Bersihkan multiple newlines jadi double newline
      .replace(/\n\n+/g, '\n\n')
      // Hapus whitespace berlebihan di setiap baris
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .trim();
  }

  getCookieString() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
  }

  getHeaders(currentTimestamp, token) {
    return {
      'host': 'tako22-normal-alisg.tiktokv.com',
      'cookie': this.getCookieString(),
      'x-ss-req-ticket': currentTimestamp,
      'x-tt-token': token,
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'user-agent': 'com.ss.android.ugc.trill/440503 (Linux; U; Android 15; en_GB; 23127PN0CC; Build/BP1A.250505.005; Cronet/TTNetVersion:b18ffdba 2026-03-04 QuicVersion:3679867a 2026-02-06)',
      'accept-encoding': 'gzip, deflate, br',
      'x-gorgon': '8404307e0000746c07924948343e3f68619db67ad43c4adfd903',
      'x-khronos': '1782574292'
    };
  }

  async chat(prompt, options = {}) {
    try {
      const currentTimestamp = "1782574313607";
      const currentUnixSec = 1782574333;
      const randomUuid = crypto.randomUUID();
      const originalTtToken = "0369bad22b4d6edfbd8cbce9ec82ae70fe03baed97d9ffc3f94e5088e87e5afec23cdb9237fd4e9828130be39c4bfb4e83cf51239246788390d54252116deb94986121da41188d1843d061e5b3ad2fdb9aae26b38f3bff9c49e5b9dcdb50d13597934--0a4e0a2072631fdaa84e3238544b960414d4f284a5b64e3b5122a0612028d010002fb08312204147d95abab6dde33ce4088bc3776d5a5ece7b51510c169a5dfab91a73c1c29c1801220674696b746f6b-3.0.1";

      const msgContentObj = {
        bot_info: { bot_session_id: "" },
        card_type: -1,
        chat_intent: "",
        client_ext: { carry_logId: "", carry_repeat_key: "", shortcut_interaction_eanble: true },
        enhanced_item_info: { have_more: false, items: [] },
        ext: { answer_status: 0, auto_send_message_type: "", content_extra: "", id_list: "{}", interaction_type: 0, is_big_video: 0, is_quote_product: 0, is_quote_video: 0, message_type: "", plugin_type: "", push_source: "", tako_out_search_id: "", tns_intercept: 0 },
        gen_style_option: [], gid: "", hint: "", hint_in_text: "", pics: [], interaction_status: [], links: [], msg_ext: {},
        multi_modal_info: { gen_image_duration: 0, gen_image_num: 1, gen_image_ratio: { height: 1600, width: 900 } },
        placeholder_sources: {}, process_info: [], goods_info: { have_more: false, goods: [] },
        search_info: { query: "" }, sources: [], status: 0, style: [],
        text: prompt,
        text_hint: "", think_content: "", users: [], items: [], videos: []
      };

      const extObj = {
        enter_from: "notification_page_tikbot",
        enter_method: "click_tikbot_cell",
        feed_bar: "", feed_consume_infos: "", first_reply_read_status: "",
        gid: "7407698655022468357", pred: {}, search_id: "", sub_enter_method: "",
        text_factor: 0.0, view_duration: 0, input_skill_mode: "default", active_action_bar: "0",
        device_info: { device_level: 3, device_score: 78.03247833251953, net_level: 1 }
      };

      const payload = new URLSearchParams();
      payload.append('op_type', '1');
      payload.append('enter_source', 'session_list_chat_sug');
      payload.append('entry_time', '1782573864291');
      payload.append('uuid', randomUuid);
      payload.append('conversation_id', options.conversationId || `T_7195936125596599301_1`);
      payload.append('msg_id', '');
      payload.append('msg_type', '1');
      payload.append('msg_content', JSON.stringify(msgContentObj));
      payload.append('session_id', '5eef89a0-0846-407e-a30c-b9f011eff4f6');
      payload.append('request_time', '1782574313595');
      payload.append('ext', JSON.stringify(extObj));
      payload.append('bot_id', '1');
      payload.append('bot_source', '1');
      payload.append('send_type', '205');
      payload.append('enable_deep_search', 'false');
      payload.append('gen_style', '0');
      payload.append('active_action_bar', '0');
      payload.append('lang_style', '0');
      payload.append('aigc_version', '0');

      const apiUrl = `https://tako22-normal-alisg.tiktokv.com/aweme/v1/tako/op/stream/?device_platform=android&os=android&ssmix=a&_rticket=1782574313598&channel=googleplay&aid=1180&app_name=trill&version_code=440503&version_name=44.5.3&manifest_version_code=440503&update_version_code=440503&ab_version=44.5.3&resolution=720*1600&dpi=281&device_type=23127PN0CC&device_brand=Xiaomi&language=en&os_api=35&os_version=15&ac=wifi&is_pad=0&app_type=normal&sys_region=GB&last_install_time=1782573370&timezone_name=Asia%2FKuala_Lumpur&app_language=en&timezone_offset=28800&host_abi=arm64-v8a&locale=en-GB&ac2=unknown&uoo=0&op_region=MY&build_number=44.5.3&region=GB&ts=${currentUnixSec}&iid=7623820063082530568&device_id=7570082692370843144`;

      const response = await axios({
        method: 'POST',
        url: apiUrl,
        headers: this.getHeaders(currentTimestamp, originalTtToken),
        data: payload.toString(),
        responseType: 'stream'
      });

      return new Promise((resolve, reject) => {
        // ===== IMPORTANT: RESET STATE UNTUK SETIAP REQUEST BARU =====
        // Jangan gunakan variable global, semua state di-reset di sini
        let finalMessage = "";
        let bufferStr = "";
        let collectedVideos = [];
        let collectedImages = [];
        let responseType = "text"; // default type
        let metadata = {};
        let logId = "";
        let cardTypeDetected = false; // Flag untuk mendeteksi card_type

        response.data.on('data', (chunk) => {
          bufferStr += chunk.toString('utf8');

          const jsonLines = bufferStr.match(/\{"status_code":.+?\}(?=\s*(\{|$))/gs);
          if (jsonLines) {
            jsonLines.forEach(line => {
              try {
                const cleanLine = line.substring(line.indexOf('{'));
                const parsed = JSON.parse(cleanLine);

                // Extract metadata
                if (parsed.extra?.log_id) logId = parsed.extra.log_id;
                if (parsed.server_process_info) {
                  metadata.latency = {
                    server_chunk_latency: parsed.server_process_info.server_chunk_latency,
                    engine_chunk_latency: parsed.server_process_info.engine_chunk_latency,
                    server_e2e_latency: parsed.server_process_info.server_e2e_latency,
                    biz_state_code: parsed.server_process_info.biz_state_code,
                    hit_engine_cache: parsed.server_process_info.hit_engine_cache,
                    use_engine_search: parsed.server_process_info.use_engine_search,
                    bot_intent: parsed.server_process_info.bot_intent
                  };
                }

                // Process patches
                if (parsed.msg_content_patch?.patch) {
                  parsed.msg_content_patch.patch.forEach(p => {
                    // ===== STEP 1: Detect card_type FIRST =====
                    // Penting: Deteksi tipe response terlebih dahulu sebelum parse text
                    if (p.field === 'card_type' && !cardTypeDetected) {
                      try {
                        const cardTypeVal = JSON.parse(p.value);
                        const cType = cardTypeVal.card_type;
                        if (cType === 301) {
                          responseType = "image_generation";
                          cardTypeDetected = true;
                        } else if (cType === 51) {
                          responseType = "video_search";
                          cardTypeDetected = true;
                        }
                      } catch(e) {}
                    }

                    // ===== STEP 2: Parse images =====
                    if (p.field === 'pics' && p.op === 'add') {
                      try {
                        const parsedPics = JSON.parse(p.value);
                        if (parsedPics && Array.isArray(parsedPics.pics)) {
                          parsedPics.pics.forEach(img => {
                            collectedImages.push({
                              image_id: img.image_id,
                              url: img.url_list?.[0] || null,
                              uri: img.uri
                            });
                          });
                        }
                      } catch(e) {}
                    }

                    // ===== STEP 3: Parse videos =====
                    if (p.field === 'sources' && p.op === 'add') {
                      try {
                        const parsedSources = JSON.parse(p.value);
                        if (parsedSources && Array.isArray(parsedSources.sources)) {
                          parsedSources.sources.forEach(src => {
                            if (src.item) {
                              collectedVideos.push({
                                rank: src.rank,
                                id: src.item.aweme_id,
                                description: src.item.desc,
                                author: {
                                  id: src.item.user?.user_id,
                                  nickname: src.item.user?.nickname,
                                  avatar: src.item.user?.avatar?.url_list?.[0]
                                },
                                cover_url: src.item.cover?.url_list?.[0],
                                digg_count: src.item.digg_count,
                                create_time: src.item.create_time,
                                video_url: `https://www.tiktok.com/@${src.item.user?.nickname}/video/${src.item.aweme_id}`
                              });
                            }
                          });
                        }
                      } catch(e) {}
                    }

                    // ===== STEP 4: Parse text (HANYA untuk text/video_search, SKIP untuk image_generation) =====
                    // PENTING: Hanya tangkap text kalau responseType-nya jelas bukan image_generation
                    if (p.field === 'text' && (p.op === 'add' || p.op === 'replace')) {
                      // Skip <data-inline> tags
                      if (p.value.includes('<data-inline')) return;
                      
                      // JANGAN tangkap text dari image_generation response
                      if (responseType === "image_generation") return;
                      
                      try {
                        const textObj = JSON.parse(p.value);
                        if (textObj && textObj.text) finalMessage += textObj.text;
                      } catch (e) {
                        if (!p.value.startsWith('{')) finalMessage += p.value;
                      }
                    }
                  });
                }
              } catch (err) {}
            });

            const lastMatch = bufferStr.lastIndexOf(jsonLines[jsonLines.length - 1]);
            if (lastMatch !== -1) {
              bufferStr = bufferStr.substring(lastMatch + jsonLines[jsonLines.length - 1].length);
            }
          }
        });

        response.data.on('end', () => {
          // Clean text message dari HTML tags
          const cleanMessage = this.cleanText(finalMessage);

          // ✨ TAMBAHAN LOGIKA ✨
          // Jika tipe respons adalah video_search tapi tidak ada video yang terkumpul,
          // kembalikan tipenya menjadi text biasa.
          if (responseType === "video_search" && collectedVideos.length === 0) {
            responseType = "text";
          }

          const output = {
            status: "success",
            type: responseType,
            metadata: {
              log_id: logId,
              ...metadata
            }
          };

          if (responseType === "image_generation") {
            output.data = {
              prompt: prompt,
              images: collectedImages
            };
          } else if (responseType === "video_search") {
            output.data = {
              query_search: prompt,
              ai_response: cleanMessage,
              total_results: collectedVideos.length,
              videos: collectedVideos
            };
          } else {
            // Plain text response
            output.data = {
              message: cleanMessage
            };
          }

          resolve(output);
        });


        response.data.on('error', () => reject(new Error('Stream error encountered')));
      });
    } catch (error) {
      throw new Error(error.response ? `API Error: ${error.response.status}` : 'Network missing / Signature Expired');
    }
  }
}

// =============== USAGE ===============
const tako = new TakoClient();

(async () => {
  try {
    // Test 1: Video Search
    const videoRes = await tako.chat("carikan video tiktok anime edit");
    console.log(JSON.stringify(videoRes, null, 2));


    // Test 2: Image Generation
    const imgRes = await tako.chat("coba generate img anime girl");
    console.log(JSON.stringify(imgRes, null, 2));

    // Test 3: Plain Text Response
    const textRes = await tako.chat("aku mw tanya orang nonton anime yuri normal??");
    console.log(JSON.stringify(textRes, null, 2));

  } catch (e) {
    console.error("❌ Error:", e.message);
  }
})();
