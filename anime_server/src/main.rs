mod kodik;
mod shikimori;

use anyhow::Result;
use axum::{
    body::Bytes,
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Json, Response},
    routing::get,
    Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{path::PathBuf, sync::Arc};
use tokio::{fs, sync::RwLock};
use tower_http::services::ServeDir;

struct AppState {
    client: reqwest::Client,
    token: RwLock<String>,
    data_path: PathBuf,
}

#[derive(Deserialize)]
struct SearchQuery {
    title: String,
}

#[derive(Deserialize)]
struct InfoQuery {
    #[serde(rename = "shikimoriId")]
    shikimori_id: String,
}

#[derive(Deserialize)]
struct LinkQuery {
    #[serde(rename = "shikimoriId")]
    shikimori_id: String,
    #[serde(rename = "seriaNum")]
    seria_num: u32,
    #[serde(rename = "translationId")]
    translation_id: String,
}

fn err_response(status: StatusCode, code: &str, message: &str) -> Response {
    (status, Json(json!({ "code": code, "message": message }))).into_response()
}

async fn search_handler(State(state): State<Arc<AppState>>, Query(q): Query<SearchQuery>) -> Response {
    match shikimori::search(&state.client, &q.title).await {
        Ok(results) => Json(json!({ "data": results })).into_response(),
        Err(e) => err_response(StatusCode::INTERNAL_SERVER_ERROR, "SEARCH_ERROR", &e.to_string()),
    }
}

async fn info_handler(State(state): State<Arc<AppState>>, Query(q): Query<InfoQuery>) -> Response {
    let token = state.token.read().await.clone();

    let (kodik_result, shikimori_result) = tokio::join!(
        kodik::get_info(&state.client, &token, &q.shikimori_id),
        shikimori::get_info(&state.client, &q.shikimori_id),
    );

    Json(json!({
        "data": {
            "kodikInfo": kodik_result.ok(),
            "shikimoriInfo": shikimori_result.ok(),
        }
    }))
    .into_response()
}

async fn link_handler(State(state): State<Arc<AppState>>, Query(q): Query<LinkQuery>) -> Response {
    let token = state.token.read().await.clone();

    match kodik::get_link(&state.client, &token, &q.shikimori_id, q.seria_num, &q.translation_id).await {
        Ok(link) => Json(json!({ "data": link })).into_response(),
        Err(e) => err_response(StatusCode::BAD_GATEWAY, "GET_LINK_ERROR", &e.to_string()),
    }
}

async fn get_data_handler(State(state): State<Arc<AppState>>) -> Response {
    match fs::read_to_string(&state.data_path).await {
        Ok(content) => match serde_json::from_str::<Value>(&content) {
            Ok(data) => Json(json!({ "data": data })).into_response(),
            Err(e) => err_response(StatusCode::INTERNAL_SERVER_ERROR, "PARSE_ERROR", &e.to_string()),
        },
        Err(e) => err_response(StatusCode::INTERNAL_SERVER_ERROR, "READ_ERROR", &e.to_string()),
    }
}

async fn post_data_handler(State(state): State<Arc<AppState>>, body: Bytes) -> Response {
    if body.is_empty() {
        return err_response(StatusCode::BAD_REQUEST, "EMPTY_BODY", "Request body is empty");
    }

    let data: Value = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(e) => return err_response(StatusCode::BAD_REQUEST, "INVALID_JSON", &e.to_string()),
    };

    let tmp_path = state.data_path.with_extension("tmp");
    let content = serde_json::to_string_pretty(&data).unwrap();

    if let Err(e) = fs::write(&tmp_path, &content).await {
        return err_response(StatusCode::INTERNAL_SERVER_ERROR, "WRITE_ERROR", &e.to_string());
    }

    if let Err(e) = fs::rename(&tmp_path, &state.data_path).await {
        if let Err(e2) = fs::write(&state.data_path, &content).await {
            return err_response(StatusCode::INTERNAL_SERVER_ERROR, "WRITE_ERROR", &e2.to_string());
        }
        let _ = e;
    }

    Json(json!({ "success": true, "message": "Данные обновлены" })).into_response()
}

#[tokio::main]
async fn main() -> Result<()> {
    let client = reqwest::Client::new();

    println!("Получаем токен kodik...");
    let token = kodik::get_token(&client).await?;
    println!("Токен получен: {}", &token[..8]);

    let data_path = std::env::current_exe()?.parent().unwrap().join("data.json");

    if !data_path.exists() {
        fs::write(&data_path, r#"{"searchMethod":"shikimoriParser","continueWatching":[]}"#).await?;
        println!("data.json создан");
    }

    let state = Arc::new(AppState { client, token: RwLock::new(token), data_path });

    let dist_path = std::env::var("DIST_PATH")
        .map(PathBuf::from)
        .unwrap_or_else(|_| std::env::current_exe().unwrap().parent().unwrap().join("dist"));

    let app = Router::new()
        .route("/api/anime/search", get(search_handler))
        .route("/api/anime/info", get(info_handler))
        .route("/api/anime/link", get(link_handler))
        .route("/api/data", get(get_data_handler).post(post_data_handler))
        .fallback_service(ServeDir::new(&dist_path).fallback(ServeDir::new(dist_path.join("public"))))
        .with_state(state);

    let port = std::env::var("PORT").ok().and_then(|p| p.parse::<u16>().ok()).unwrap_or(3000);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    println!("Сервер запущен на http://localhost:{}", port);

    axum::serve(listener, app).await?;
    Ok(())
}
