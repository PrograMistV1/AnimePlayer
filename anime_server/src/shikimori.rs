use anyhow::{anyhow, Result};
use once_cell::sync::Lazy;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::future::Future;
use std::pin::Pin;

const SHIKIMORI_DOMAIN: &str = "shikimori.one";

static SEL_SEARCH_ITEM: Lazy<Selector> = Lazy::new(|| Selector::parse("div.b-db_entry-variant-list_item").unwrap());
static SEL_INFO_NAME: Lazy<Selector> = Lazy::new(|| Selector::parse("div.name a").unwrap());
static SEL_POSTER: Lazy<Selector> =
    Lazy::new(|| Selector::parse("div.b-db_entry-poster.b-image meta[itemprop='image']").unwrap());
static SEL_TITLE: Lazy<Selector> = Lazy::new(|| Selector::parse("header.head h1").unwrap());
static SEL_ENTRY_INFO: Lazy<Selector> =
    Lazy::new(|| Selector::parse(".c-about .c-info-left .block .b-entry-info .line-container").unwrap());
static SEL_KEY: Lazy<Selector> = Lazy::new(|| Selector::parse(".key").unwrap());
static SEL_VALUE: Lazy<Selector> = Lazy::new(|| Selector::parse(".value").unwrap());
static SEL_GENRE_RU: Lazy<Selector> = Lazy::new(|| Selector::parse(".genre-ru").unwrap());
static SEL_RATING: Lazy<Selector> = Lazy::new(|| Selector::parse("meta[itemprop='ratingValue']").unwrap());
static SEL_DESCRIPTION: Lazy<Selector> =
    Lazy::new(|| Selector::parse(".c-description .block .b-text_with_paragraphs").unwrap());
static SEL_NOTHING: Lazy<Selector> = Lazy::new(|| Selector::parse(".b-nothing_here").unwrap());
static SEL_IMG_SRCSET: Lazy<Selector> = Lazy::new(|| Selector::parse("div.image picture img").unwrap());
static SEL_LINE_KEY: Lazy<Selector> = Lazy::new(|| Selector::parse("div.key").unwrap());
static SEL_LINE_FIRST: Lazy<Selector> = Lazy::new(|| Selector::parse("div.line").unwrap());
static SEL_DATA_TYPE: Lazy<Selector> = Lazy::new(|| Selector::parse("div.value div.b-tag").unwrap());

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    #[serde(rename = "shikimoriId")]
    pub shikimori_id: Option<String>,
    pub title: Option<String>,
    #[serde(rename = "original_title")]
    pub original_title: Option<String>,
    pub poster: Option<String>,
    #[serde(rename = "type")]
    pub anime_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AnimeInfo {
    pub title: Option<String>,
    pub poster: Option<String>,
    #[serde(rename = "type")]
    pub anime_type: Option<String>,
    pub episodes: Option<Vec<String>>,
    pub status: Option<String>,
    pub genres: Option<Vec<String>>,
    pub rating: f64,
    pub description: Option<Vec<String>>,
}

pub async fn search(client: &reqwest::Client, title: &str) -> Result<Vec<SearchResult>> {
    let url = format!("https://{}/animes/autocomplete/v2?search={}", SHIKIMORI_DOMAIN, urlencoding(title));

    let resp = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0")
        .header("Accept", "application/json, text/plain, */*")
        .header("X-Requested-With", "XMLHttpRequest")
        .send()
        .await?;

    if resp.status() == 429 {
        return Err(anyhow!("Слишком много запросов к shikimori"));
    }
    if !resp.status().is_success() {
        return Err(anyhow!("Shikimori вернул код: {}", resp.status()));
    }

    let json: serde_json::Value = resp.json().await?;
    let html_content = json["content"].as_str().unwrap_or("");
    Ok(parse_search_results(html_content))
}

fn parse_search_results(html: &str) -> Vec<SearchResult> {
    let document = Html::parse_document(html);

    document
        .select(&SEL_SEARCH_ITEM)
        .filter(|el| el.value().attr("data-type") == Some("anime"))
        .filter_map(|el| {
            let info = el.select(&Selector::parse("div.info").unwrap()).next()?;

            let name_link = info.select(&SEL_INFO_NAME).next()?;
            let shikimori_id = el.value().attr("data-id").map(String::from);
            let original_title = name_link.value().attr("title").map(String::from);
            let title = name_link.text().collect::<String>().split('/').next().map(|s| s.trim().to_string());

            let poster = el
                .select(&SEL_IMG_SRCSET)
                .next()
                .and_then(|img| img.value().attr("srcset"))
                .and_then(|s| s.split(' ').next())
                .map(String::from);

            let anime_type = info
                .select(&SEL_LINE_FIRST)
                .next()
                .filter(|line| {
                    line.select(&SEL_LINE_KEY)
                        .next()
                        .map(|k| k.text().collect::<String>().trim() == "Тип:")
                        .unwrap_or(false)
                })
                .and_then(|line| line.select(&SEL_DATA_TYPE).next())
                .map(|el| el.text().collect::<String>().trim().to_string())
                .filter(|s| !s.is_empty());

            Some(SearchResult { shikimori_id, title, original_title, poster, anime_type })
        })
        .collect()
}

pub async fn get_info(client: &reqwest::Client, shikimori_id: &str) -> Result<AnimeInfo> {
    get_info_retry(client, shikimori_id, 0).await
}

fn get_info_retry<'a>(
    client: &'a reqwest::Client,
    shikimori_id: &'a str,
    retry: u32,
) -> Pin<Box<dyn Future<Output = Result<AnimeInfo>> + Send + 'a>> {
    Box::pin(async move {
        let url = format!("https://{}/animes/{}", SHIKIMORI_DOMAIN, shikimori_id);

        let resp = client
            .get(&url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0")
            .header("Accept", "application/json, text/plain, */*")
            .header("X-Requested-With", "XMLHttpRequest")
            .send()
            .await?;

        if resp.status() == 429 {
            if retry < 5 {
                let delay = 200 * 2u64.pow(retry);
                tokio::time::sleep(tokio::time::Duration::from_millis(delay)).await;
                return get_info_retry(client, shikimori_id, retry + 1).await;
            }
            return Err(anyhow!("429: слишком много запросов"));
        }

        let html = resp.text().await?;
        parse_anime_info(&html)
    })
}

fn parse_anime_info(html: &str) -> Result<AnimeInfo> {
    let document = Html::parse_document(html);

    let title = document.select(&SEL_TITLE).next().and_then(|el| el.text().next()).map(|s| s.trim().to_string());

    let poster = document.select(&SEL_POSTER).next().and_then(|el| el.value().attr("content")).map(String::from);

    let rating = document
        .select(&SEL_RATING)
        .next()
        .and_then(|el| el.value().attr("content"))
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    let mut anime_type = None;
    let mut episodes = None;
    let mut status = None;
    let mut genres = None;

    for line in document.select(&SEL_ENTRY_INFO) {
        let key = line.select(&SEL_KEY).next().map(|el| el.text().collect::<String>()).unwrap_or_default();
        let key = key.replace(':', "").trim().to_string();

        let value = line.select(&SEL_VALUE).next();

        match key.as_str() {
            "Тип" => {
                anime_type = value.map(|v| v.text().collect::<String>().trim().to_string());
            }
            "Эпизоды" => {
                episodes = value.map(|v| v.text().collect::<String>().split(" / ").map(String::from).collect());
            }
            "Статус" => {
                status = value.and_then(|v| {
                    v.select(&Selector::parse("*").unwrap())
                        .next()
                        .and_then(|el| el.value().attr("data-text"))
                        .map(String::from)
                });
            }
            "Жанры" => {
                genres = value.map(|v| {
                    v.select(&SEL_GENRE_RU)
                        .map(|el| el.text().collect::<String>().trim().to_string())
                        .filter(|s| !s.is_empty())
                        .collect()
                });
            }
            _ => {}
        }
    }

    let description = {
        let block = document.select(&SEL_DESCRIPTION).next();
        match block {
            None => None,
            Some(b) if b.select(&SEL_NOTHING).next().is_some() => None,
            Some(b) => {
                let html_str = b.inner_html();
                let paragraphs: Vec<String> = html_str
                    .split("<br>")
                    .flat_map(|p| p.split("<br/>"))
                    .flat_map(|p| p.split("<br />"))
                    .map(|p| {
                        let fragment = Html::parse_fragment(p);
                        fragment.root_element().text().collect::<String>().trim().to_string()
                    })
                    .filter(|p| !p.is_empty())
                    .collect();

                if paragraphs.is_empty() { None } else { Some(paragraphs) }
            }
        }
    };

    Ok(AnimeInfo { title, poster, anime_type, episodes, status, genres, rating, description })
}

fn urlencoding(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (b as char).to_string(),
            _ => format!("%{:02X}", b),
        })
        .collect()
}
