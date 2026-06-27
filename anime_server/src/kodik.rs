use anyhow::{anyhow, Result};
use base64::{engine::general_purpose::STANDARD, Engine};
use once_cell::sync::Lazy;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};

const KODIK_API_BASE: &str = "https://kodik-api.com";
const KODIK_PLAYER_BASE: &str = "https://kodikplayer.com";
const KODIK_DB_BASE: &str = "https://kodikdb.com";
const TOKEN_SCRIPT_URL: &str = "https://kodik-add.com/add-players.min.js?v=2";
const ALPHABET: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

static SEL_SERIAL_SERIES: Lazy<Selector> =
    Lazy::new(|| Selector::parse("div.serial-series-box select option").unwrap());
static SEL_SERIAL_TRANS: Lazy<Selector> =
    Lazy::new(|| Selector::parse("div.serial-translations-box select option").unwrap());
static SEL_MOVIE_TRANS: Lazy<Selector> =
    Lazy::new(|| Selector::parse("div.movie-translations-box select option").unwrap());
static SEL_SCRIPT: Lazy<Selector> = Lazy::new(|| Selector::parse("script").unwrap());
static SEL_SERIAL_TRANS_OPT: Lazy<Selector> =
    Lazy::new(|| Selector::parse("div.serial-translations-box select option").unwrap());
static SEL_MOVIE_TRANS_OPT: Lazy<Selector> =
    Lazy::new(|| Selector::parse("div.movie-translations-box select option").unwrap());

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Translation {
    pub id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub translation_type: String,
    pub is_voice: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnimeInfo {
    pub series_count: u32,
    pub translations: Vec<Translation>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnimeLink {
    pub link: String,
    pub qualities: Vec<u32>,
}

pub async fn get_token(client: &reqwest::Client) -> Result<String> {
    let data = client.get(TOKEN_SCRIPT_URL).send().await?.text().await?;

    if let Some(token) = extract_between(&data, "token=\"", "\"") {
        return Ok(token.to_string());
    }
    if let Some(token) = extract_between(&data, "token=", "\"") {
        let token = token.trim_start_matches('"');
        return Ok(token.to_string());
    }

    Err(anyhow!("Токен не найден в скрипте"))
}

pub async fn get_info(client: &reqwest::Client, token: &str, shikimori_id: &str) -> Result<AnimeInfo> {
    let player_link = fetch_player_link(client, token, shikimori_id).await?;
    let html = fetch_html(client, &player_link).await?;

    if is_serial(&player_link) {
        parse_serial_info(&html)
    } else if is_video(&player_link) {
        parse_video_info(&html)
    } else {
        Err(anyhow!("Ссылка не распознана как сериал или фильм"))
    }
}

pub async fn get_link(
    client: &reqwest::Client,
    token: &str,
    shikimori_id: &str,
    seria_num: u32,
    translation_id: &str,
) -> Result<AnimeLink> {
    let player_link = fetch_player_link(client, token, shikimori_id).await?;
    let mut html = fetch_html(client, &player_link).await?;

    if translation_id != "0" {
        if let Some(translation_url) = resolve_translation(&html, translation_id, seria_num, &player_link) {
            html = fetch_html(client, &translation_url).await?;
        }
    }

    let url_params = extract_url_params(&html)?;
    let video_info = extract_video_info(&html)?;

    let post_link = get_post_link(client, &video_info.script_url).await?;

    let params = [
        ("hash", video_info.hash.as_str()),
        ("id", video_info.id.as_str()),
        ("type", video_info.video_type.as_str()),
        ("d", url_params.d.as_str()),
        ("d_sign", url_params.d_sign.as_str()),
        ("pd", url_params.pd.as_str()),
        ("pd_sign", url_params.pd_sign.as_str()),
        ("ref", ""),
        ("ref_sign", url_params.ref_sign.as_str()),
        ("bad_user", "true"),
        ("cdn_is_working", "true"),
    ];

    let resp = client
        .post(format!("{}{}", KODIK_PLAYER_BASE, post_link))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .form(&params)
        .send()
        .await?
        .json::<serde_json::Value>()
        .await?;

    let links = resp["links"].as_object().ok_or_else(|| anyhow!("Нет links в ответе"))?;

    let mut qualities: Vec<u32> = links.keys().filter_map(|k| k.parse::<u32>().ok()).collect();
    qualities.sort_unstable_by(|a, b| b.cmp(a));

    let raw_url = links["360"][0]["src"].as_str().ok_or_else(|| anyhow!("Нет src в links[360][0]"))?;

    let url = if raw_url.contains("mp4:hls:manifest.m3u8") {
        raw_url.to_string()
    } else {
        decrypt_url(raw_url)?
    };

    let download_url = {
        let s = url.replace("https:", "");
        if s.len() > 25 { s[..s.len() - 25].to_string() } else { s }
    };

    Ok(AnimeLink { link: download_url, qualities })
}

async fn fetch_player_link(client: &reqwest::Client, token: &str, shikimori_id: &str) -> Result<String> {
    let find_url = format!("{}%2Ffind-player%3FshikimoriID%3D{}", urlencoding(KODIK_DB_BASE), shikimori_id);

    let url = format!(
        "{}/get-player?title=Player&hasPlayer=false&url={}&token={}&shikimoriID={}",
        KODIK_API_BASE, find_url, token, shikimori_id
    );

    let resp = client.get(&url).send().await?.json::<serde_json::Value>().await?;

    if let Some(err) = resp["error"].as_str() {
        return Err(anyhow!("Kodik error: {}", err));
    }

    if resp["found"].as_bool() != Some(true) {
        return Err(anyhow!("Аниме не найдено в kodik по shikimori id: {}", shikimori_id));
    }

    let link = resp["link"].as_str().ok_or_else(|| anyhow!("Нет link в ответе"))?;

    if link.starts_with("//") {
        Ok(format!("https:{}", link))
    } else {
        Ok(link.to_string())
    }
}

async fn fetch_html(client: &reqwest::Client, url: &str) -> Result<String> {
    Ok(client.get(url).send().await?.text().await?)
}

fn is_serial(url: &str) -> bool {
    url.find("kodikplayer.com/").map(|idx| url.as_bytes().get(idx + 16) == Some(&b's')).unwrap_or(false)
}

fn is_video(url: &str) -> bool {
    url.find("kodikplayer.com/").map(|idx| url.as_bytes().get(idx + 16) == Some(&b'v')).unwrap_or(false)
}

fn parse_serial_info(html: &str) -> Result<AnimeInfo> {
    let document = Html::parse_document(html);

    let series_count = document.select(&SEL_SERIAL_SERIES).count() as u32;
    let translations = parse_translations(&document, &SEL_SERIAL_TRANS);

    Ok(AnimeInfo { series_count, translations })
}

fn parse_video_info(html: &str) -> Result<AnimeInfo> {
    let document = Html::parse_document(html);
    let translations = parse_translations(&document, &SEL_MOVIE_TRANS);

    Ok(AnimeInfo { series_count: 0, translations })
}

fn parse_translations(document: &Html, selector: &Selector) -> Vec<Translation> {
    let elements: Vec<_> = document.select(selector).collect();

    if elements.is_empty() {
        return vec![Translation {
            id: "0".to_string(),
            title: "Неизвестно".to_string(),
            translation_type: "Неизвестно".to_string(),
            is_voice: false,
        }];
    }

    elements
        .iter()
        .map(|el| {
            let id = el.value().attr("data-id").unwrap_or("0").to_string();
            let title = el.text().collect::<String>().trim().to_string();
            let raw_type = el.value().attr("data-translation-type").unwrap_or("");
            let translation_type = match raw_type {
                "voice" => "озвучка",
                "subtitles" => "субтитры",
                _ => "Неизвестно",
            }
            .to_string();
            let is_voice = translation_type == "озвучка";

            Translation { id, title, translation_type, is_voice }
        })
        .collect()
}

fn resolve_translation(html: &str, translation_id: &str, seria_num: u32, player_link: &str) -> Option<String> {
    let document = Html::parse_document(html);
    let is_serial = seria_num != 0 || is_serial(player_link);

    let selector = if is_serial {
        &*SEL_SERIAL_TRANS_OPT
    } else {
        &*SEL_MOVIE_TRANS_OPT
    };
    let content_type = if is_serial { "serial" } else { "video" };

    for el in document.select(selector) {
        if el.value().attr("data-id") == Some(translation_id) {
            let media_hash = el.value().attr("data-media-hash")?;
            let media_id = el.value().attr("data-media-id")?;

            return Some(format!(
                "{}/{}/{}/{}/720p?min_age=16&first_url=false&season=1&episode={}",
                KODIK_PLAYER_BASE, content_type, media_id, media_hash, seria_num
            ));
        }
    }
    None
}

#[derive(Debug)]
struct UrlParams {
    d: String,
    d_sign: String,
    pd: String,
    pd_sign: String,
    ref_sign: String,
}

fn extract_url_params(html: &str) -> Result<UrlParams> {
    let params_str =
        extract_between(html, "urlParams = '", "';").ok_or_else(|| anyhow!("urlParams не найден на странице"))?;

    let v: serde_json::Value = serde_json::from_str(params_str)?;

    Ok(UrlParams {
        d: v["d"].as_str().unwrap_or("").to_string(),
        d_sign: v["d_sign"].as_str().unwrap_or("").to_string(),
        pd: v["pd"].as_str().unwrap_or("").to_string(),
        pd_sign: v["pd_sign"].as_str().unwrap_or("").to_string(),
        ref_sign: v["ref_sign"].as_str().unwrap_or("").to_string(),
    })
}

#[derive(Debug)]
struct VideoInfo {
    video_type: String,
    hash: String,
    id: String,
    script_url: String,
}

fn extract_video_info(html: &str) -> Result<VideoInfo> {
    let document = Html::parse_document(html);
    let scripts: Vec<_> = document.select(&SEL_SCRIPT).collect();

    let script_url = scripts.get(1).and_then(|s| s.value().attr("src")).unwrap_or("").to_string();

    let script_text = scripts.get(4).map(|s| s.text().collect::<String>()).unwrap_or_default();

    let video_type =
        extract_between(&script_text, ".type = '", "'").ok_or_else(|| anyhow!("Не найден type в скрипте"))?.to_string();

    let hash =
        extract_between(&script_text, ".hash = '", "'").ok_or_else(|| anyhow!("Не найден hash в скрипте"))?.to_string();

    let id =
        extract_between(&script_text, ".id = '", "'").ok_or_else(|| anyhow!("Не найден id в скрипте"))?.to_string();

    Ok(VideoInfo { video_type, hash, id, script_url })
}

async fn get_post_link(client: &reqwest::Client, script_url: &str) -> Result<String> {
    let url = format!("{}{}", KODIK_PLAYER_BASE, script_url);
    let data = client.get(&url).send().await?.text().await?;

    let ajax_idx = data.find("$.ajax").ok_or_else(|| anyhow!("$.ajax не найден в скрипте"))?;

    let start = ajax_idx + 30;
    let end_marker = "cache:!1";
    let end = data.find(end_marker).ok_or_else(|| anyhow!("cache:!1 не найден"))? - 3;

    if start >= end {
        return Err(anyhow!("Неверные индексы при извлечении post link"));
    }

    let encoded = &data[start..end];
    let decoded = STANDARD.decode(encoded)?;
    Ok(String::from_utf8(decoded)?)
}

fn decrypt_char(ch: char, shift: usize) -> char {
    let is_lower = ch.is_lowercase();
    let upper = ch.to_uppercase().next().unwrap_or(ch);
    if let Some(idx) = ALPHABET.chars().position(|c| c == upper) {
        let shifted = ALPHABET.chars().nth((idx + shift) % 26).unwrap_or(upper);
        if is_lower {
            shifted.to_lowercase().next().unwrap_or(shifted)
        } else {
            shifted
        }
    } else {
        ch
    }
}

fn try_decrypt(encoded: &str, shift: usize) -> Option<String> {
    let rotated: String = encoded.chars().map(|c| decrypt_char(c, shift)).collect();
    let padding = (4 - rotated.len() % 4) % 4;
    let padded = format!("{}{}", rotated, "=".repeat(padding));

    STANDARD
        .decode(padded)
        .ok()
        .and_then(|bytes| String::from_utf8(bytes).ok())
        .filter(|s| s.contains("mp4:hls:manifest.m3u8"))
}

fn decrypt_url(encoded: &str) -> Result<String> {
    for shift in 0..26 {
        if let Some(result) = try_decrypt(encoded, shift) {
            return Ok(result);
        }
    }
    Err(anyhow!("Не удалось расшифровать ссылку"))
}

fn extract_between<'a>(text: &'a str, start_marker: &str, end_marker: &str) -> Option<&'a str> {
    let start_idx = text.find(start_marker)?;
    let value_start = start_idx + start_marker.len();
    let end_idx = text[value_start..].find(end_marker)?;
    Some(&text[value_start..value_start + end_idx])
}

fn urlencoding(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            _ => format!("%{:02X}", c as u32),
        })
        .collect()
}
