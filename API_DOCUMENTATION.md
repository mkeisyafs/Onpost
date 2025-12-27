# 📚 Foru.ms API Documentation

> **Version:** v1.9.1  
> **Base URL:** `https://foru.ms`  
> **OpenAPI Spec:** `https://foru.ms/specs/v1/openapi.json`  
> **Format:** `application/json`  
> **Contact:** [i@foru.ms](mailto:i@foru.ms)

---

## 🔐 Authentication

API ini mendukung dua metode autentikasi:

### 1. API Key Authentication

Sertakan API Key dalam header `x-api-key`.

```http
x-api-key: YOUR_API_KEY
```

**Catatan:** Saat menggunakan API Key authentication, beberapa endpoint memerlukan `userId` secara eksplisit di request body atau query parameter.

### 2. Bearer Token (JWT)

Sertakan token JWT dalam header `Authorization`.

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Catatan:** Saat menggunakan JWT authentication, `userId` otomatis diambil dari token dan tidak bisa di-override.

---

## 📋 Daftar Endpoint

### 1. 🔑 Auth (Authentication)

| Method | Endpoint                       | Deskripsi                               |
| ------ | ------------------------------ | --------------------------------------- |
| `POST` | `/api/v1/auth/login`           | Login pengguna                          |
| `POST` | `/api/v1/auth/register`        | Registrasi pengguna baru                |
| `GET`  | `/api/v1/auth/me`              | Mengambil informasi user dari JWT token |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset token            |
| `POST` | `/api/v1/auth/reset-password`  | Reset password dengan token             |
| `GET`  | `/api/v1/auth/security`        | Mengambil informasi keamanan akun       |

---

#### `POST /api/v1/auth/login`

Login pengguna ke sistem.

**Request Body:**

```json
{
  "login": "string (email atau username)",
  "password": "string"
}
```

**Response (200):**

```json
{
  "token": "string (JWT token)"
}
```

**Error Responses:**

- `401` - Unauthorized (invalid credentials)
- `405` - Method not allowed

---

#### `POST /api/v1/auth/register`

Mendaftarkan pengguna baru.

**Request Body:**

```json
{
  "username": "string (required)",
  "email": "string (required)",
  "password": "string (required)",
  "displayName": "string (optional)",
  "emailVerified": "boolean (optional)",
  "roles": ["string"] (optional),
  "extendedData": {} (optional)
}
```

**Response (201):**

```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "displayName": "string",
  "emailVerified": false,
  "roles": [],
  "createdAt": "string"
}
```

**Error Responses:**

- `400` - Bad request (validation error)
- `401` - Unauthorized
- `405` - Method not allowed

---

#### `GET /api/v1/auth/me`

Mengambil informasi user yang sedang login berdasarkan JWT token.

**Headers:**

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**

```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "displayName": "string",
  "emailVerified": true,
  "roles": ["string"],
  "bio": "string",
  "signature": "string",
  "url": "string",
  "extendedData": {}
}
```

**Error Responses:**

- `401` - Unauthorized (invalid/missing JWT)

---

#### `POST /api/v1/auth/forgot-password`

Request token untuk reset password.

**Request Body:**

```json
{
  "email": "string (required)"
}
```

**Response (200):**

```json
{
  "resetToken": "string"
}
```

**Error Responses:**

- `400` - Bad request
- `401` - Unauthorized
- `404` - User not found
- `405` - Method not allowed

---

#### `POST /api/v1/auth/reset-password`

Reset password dengan token.

**Request Body:**

```json
{
  "password": "string (required, new password)",
  "oldPassword": "string (optional, if changing password)",
  "email": "string (optional)"
}
```

**Response (200):**

```json
{
  "message": "Password reset successful"
}
```

**Error Responses:**

- `400` - Bad request
- `401` - Unauthorized
- `404` - User not found
- `405` - Method not allowed

---

#### `GET /api/v1/auth/security`

Mengambil informasi keamanan akun (memerlukan autentikasi).

**Headers:**

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response (200):**

```json
{
  "userId": "string",
  "username": "string",
  "registrationIp": "string",
  "registrationDate": "2025-01-01T00:00:00.000Z",
  "lastIp": "string",
  "lastSeenAt": "2025-01-01T00:00:00.000Z",
  "isOnline": true,
  "emailVerified": true
}
```

**Error Responses:**

- `401` - Unauthorized
- `405` - Method not allowed

---

### 2. 📝 Thread

| Method   | Endpoint                          | Deskripsi                       |
| -------- | --------------------------------- | ------------------------------- |
| `GET`    | `/api/v1/threads`                 | Mengambil daftar threads        |
| `POST`   | `/api/v1/thread`                  | Membuat thread baru             |
| `GET`    | `/api/v1/thread/{id}`             | Mengambil detail thread         |
| `PUT`    | `/api/v1/thread/{id}`             | Memperbarui thread              |
| `DELETE` | `/api/v1/thread/{id}`             | Menghapus thread                |
| `GET`    | `/api/v1/thread/{id}/posts`       | Mengambil posts dalam thread    |
| `GET`    | `/api/v1/thread/{id}/likes`       | Mengambil likes pada thread     |
| `POST`   | `/api/v1/thread/{id}/likes`       | Like thread                     |
| `DELETE` | `/api/v1/thread/{id}/likes`       | Remove like dari thread         |
| `GET`    | `/api/v1/thread/{id}/dislikes`    | Mengambil dislikes pada thread  |
| `POST`   | `/api/v1/thread/{id}/dislikes`    | Dislike thread                  |
| `DELETE` | `/api/v1/thread/{id}/dislikes`    | Remove dislike dari thread      |
| `GET`    | `/api/v1/thread/{id}/upvotes`     | Mengambil upvotes pada thread   |
| `POST`   | `/api/v1/thread/{id}/upvotes`     | Upvote thread                   |
| `DELETE` | `/api/v1/thread/{id}/upvotes`     | Remove upvote dari thread       |
| `GET`    | `/api/v1/thread/{id}/downvotes`   | Mengambil downvotes pada thread |
| `POST`   | `/api/v1/thread/{id}/downvotes`   | Downvote thread                 |
| `DELETE` | `/api/v1/thread/{id}/downvotes`   | Remove downvote dari thread     |
| `GET`    | `/api/v1/thread/{id}/subscribers` | Mengambil subscribers thread    |
| `POST`   | `/api/v1/thread/{id}/subscribers` | Subscribe ke thread             |
| `DELETE` | `/api/v1/thread/{id}/subscribers` | Unsubscribe dari thread         |

---

#### `GET /api/v1/threads`

Mengambil daftar threads dengan pagination berbasis cursor.

**Query Parameters:**

| Parameter | Type   | Required | Deskripsi                                                                                   |
| --------- | ------ | -------- | ------------------------------------------------------------------------------------------- |
| `query`   | string | No       | Kata kunci pencarian                                                                        |
| `tagId`   | string | No       | Filter berdasarkan tag ID                                                                   |
| `filter`  | string | No       | Sort order: `newest`, `oldest`                                                              |
| `type`    | string | No       | Filter by interaction: `created`, `liked`, `disliked`, `upvoted`, `downvoted`, `subscribed` |
| `cursor`  | string | No       | Cursor untuk pagination                                                                     |
| `userId`  | string | No       | Filter berdasarkan user ID                                                                  |

**Response (200):**

```json
{
  "threads": [
    {
      "id": "string",
      "title": "string",
      "slug": "string",
      "body": "string",
      "locked": false,
      "pinned": false,
      "user": {
        "id": "string",
        "username": "string"
      },
      "tags": [],
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "nextThreadCursor": "string",
  "count": 0
}
```

---

#### `POST /api/v1/thread`

Membuat thread baru.

**Request Body:**

```json
{
  "title": "string (required)",
  "body": "string (required)",
  "slug": "string (optional, auto-generated if not provided)",
  "userId": "string (required for API Key auth)",
  "locked": false,
  "pinned": false,
  "tags": ["tag_id_1", "tag_id_2"],
  "poll": {
    "title": "string",
    "options": [
      { "title": "Option 1", "color": "#ff0000" },
      { "title": "Option 2", "color": "#00ff00" }
    ]
  },
  "extendedData": {}
}
```

**Response (201):**

```json
{
  "id": "string",
  "title": "string",
  "slug": "string",
  "body": "string",
  "locked": false,
  "pinned": false,
  "user": {},
  "tags": [],
  "createdAt": "string",
  "updatedAt": "string"
}
```

---

#### `GET /api/v1/thread/{id}`

Mengambil detail thread berdasarkan ID.

**Path Parameters:**

| Parameter | Type   | Required | Deskripsi |
| --------- | ------ | -------- | --------- |
| `id`      | string | Yes      | ID thread |

**Response (200):**

```json
{
  "id": "string",
  "title": "string",
  "slug": "string",
  "body": "string",
  "locked": false,
  "pinned": false,
  "user": {
    "id": "string",
    "username": "string"
  },
  "tags": [],
  "createdAt": "string",
  "updatedAt": "string"
}
```

---

#### `PUT /api/v1/thread/{id}`

Memperbarui thread.

**Request Body:**

```json
{
  "title": "string",
  "slug": "string",
  "body": "string",
  "userId": "string (required for API Key auth)",
  "locked": false,
  "pinned": false,
  "extendedData": {}
}
```

---

#### `GET /api/v1/thread/{id}/posts`

Mengambil posts dalam thread.

**Query Parameters:**

| Parameter | Type   | Required | Deskripsi                |
| --------- | ------ | -------- | ------------------------ |
| `query`   | string | No       | Search query             |
| `cursor`  | string | No       | Pagination cursor        |
| `filter`  | string | No       | Sort: `newest`, `oldest` |

**Response (200):**

```json
{
  "posts": [
    {
      "id": "string",
      "body": "string",
      "userId": "string",
      "threadId": "string",
      "parentId": "string",
      "bestAnswer": false,
      "likes": [],
      "upvotes": [],
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "nextPostCursor": "string",
  "count": 0
}
```

---

### 3. 💬 Post

| Method   | Endpoint                      | Deskripsi                    |
| -------- | ----------------------------- | ---------------------------- |
| `GET`    | `/api/v1/posts`               | Mengambil daftar posts       |
| `POST`   | `/api/v1/post`                | Membuat post baru            |
| `GET`    | `/api/v1/post/{id}`           | Mengambil detail post        |
| `PUT`    | `/api/v1/post/{id}`           | Memperbarui post             |
| `DELETE` | `/api/v1/post/{id}`           | Menghapus post               |
| `GET`    | `/api/v1/post/{id}/likes`     | Mengambil likes pada post    |
| `POST`   | `/api/v1/post/{id}/likes`     | Like post                    |
| `DELETE` | `/api/v1/post/{id}/likes`     | Remove like dari post        |
| `GET`    | `/api/v1/post/{id}/dislikes`  | Mengambil dislikes pada post |
| `POST`   | `/api/v1/post/{id}/dislikes`  | Dislike post                 |
| `DELETE` | `/api/v1/post/{id}/dislikes`  | Remove dislike dari post     |
| `GET`    | `/api/v1/post/{id}/upvotes`   | Mengambil upvotes pada post  |
| `POST`   | `/api/v1/post/{id}/upvotes`   | Upvote post                  |
| `DELETE` | `/api/v1/post/{id}/upvotes`   | Remove upvote dari post      |
| `GET`    | `/api/v1/post/{id}/downvotes` | Mengambil downvotes          |
| `POST`   | `/api/v1/post/{id}/downvotes` | Downvote post                |
| `DELETE` | `/api/v1/post/{id}/downvotes` | Remove downvote dari post    |

---

#### `GET /api/v1/posts`

Mengambil daftar posts dengan filter.

**Query Parameters:**

| Parameter | Type   | Required | Deskripsi                                                                     |
| --------- | ------ | -------- | ----------------------------------------------------------------------------- |
| `query`   | string | No       | Search query                                                                  |
| `filter`  | string | No       | Sort: `newest`, `oldest`                                                      |
| `type`    | string | No       | Filter by interaction: `created`, `liked`, `disliked`, `upvoted`, `downvoted` |
| `cursor`  | string | No       | Pagination cursor                                                             |
| `userId`  | string | No       | Filter by user ID                                                             |

**Response (200):**

```json
{
  "posts": [],
  "nextPostCursor": "string",
  "count": 0
}
```

---

#### `POST /api/v1/post`

Membuat post baru.

**Request Body:**

```json
{
  "body": "string (required)",
  "threadId": "string (required)",
  "userId": "string (required for API Key auth)",
  "parentId": "string (optional, for replies)",
  "extendedData": {}
}
```

**Response (201):**

```json
{
  "id": "string",
  "body": "string",
  "userId": "string",
  "threadId": "string",
  "parentId": "string",
  "bestAnswer": false,
  "createdAt": "string",
  "updatedAt": "string"
}
```

---

### 4. 👤 User

| Method   | Endpoint                      | Deskripsi                  |
| -------- | ----------------------------- | -------------------------- |
| `GET`    | `/api/v1/users`               | Mengambil daftar users     |
| `POST`   | `/api/v1/user`                | Membuat user baru          |
| `GET`    | `/api/v1/user/{id}`           | Mengambil detail user      |
| `PUT`    | `/api/v1/user/{id}`           | Memperbarui user           |
| `DELETE` | `/api/v1/user/{id}`           | Menghapus user             |
| `GET`    | `/api/v1/user/{id}/followers` | Mengambil daftar followers |
| `POST`   | `/api/v1/user/{id}/followers` | Follow user                |
| `DELETE` | `/api/v1/user/{id}/followers` | Unfollow user              |
| `GET`    | `/api/v1/user/{id}/following` | Mengambil daftar following |
| `GET`    | `/api/v1/user/{id}/threads`   | Mengambil threads by user  |
| `GET`    | `/api/v1/user/{id}/posts`     | Mengambil posts by user    |

---

#### `GET /api/v1/users`

Mengambil daftar users.

**Query Parameters:**

| Parameter | Type   | Required | Deskripsi                          |
| --------- | ------ | -------- | ---------------------------------- |
| `query`   | string | No       | Search by username or display name |
| `filter`  | string | No       | Sort results                       |
| `cursor`  | string | No       | Pagination cursor                  |

**Response (200):**

```json
{
  "users": [
    {
      "id": "string",
      "username": "string",
      "email": "string",
      "displayName": "string",
      "emailVerified": true,
      "roles": [],
      "bio": "string",
      "signature": "string",
      "url": "string",
      "extendedData": {}
    }
  ],
  "nextUserCursor": "string",
  "count": 0
}
```

---

#### `POST /api/v1/user`

Membuat user baru (admin only).

**Request Body:**

```json
{
  "username": "string (required)",
  "email": "string (required)",
  "password": "string (required)",
  "displayName": "string",
  "emailVerified": false,
  "roles": ["string"],
  "bio": "string",
  "signature": "string",
  "url": "string",
  "extendedData": {}
}
```

---

#### `PUT /api/v1/user/{id}`

Memperbarui user.

**Request Body:**

```json
{
  "username": "string",
  "email": "string",
  "displayName": "string",
  "password": "string",
  "emailVerified": true,
  "roles": ["string"],
  "bio": "string",
  "signature": "string",
  "url": "string",
  "extendedData": {}
}
```

---

#### `POST /api/v1/user/{id}/followers`

Follow user lain.

**Request Body:**

```json
{
  "followerId": "string (required for API Key auth)",
  "extendedData": {}
}
```

---

### 5. 📨 Private Message

| Method   | Endpoint                       | Deskripsi           |
| -------- | ------------------------------ | ------------------- |
| `GET`    | `/api/v1/private-messages`     | Mengambil daftar PM |
| `POST`   | `/api/v1/private-message`      | Mengirim PM baru    |
| `GET`    | `/api/v1/private-message/{id}` | Mengambil detail PM |
| `POST`   | `/api/v1/private-message/{id}` | Membalas PM         |
| `PATCH`  | `/api/v1/private-message/{id}` | Update PM           |
| `DELETE` | `/api/v1/private-message/{id}` | Menghapus PM        |

---

#### `POST /api/v1/private-message`

Mengirim private message baru.

**Request Body:**

```json
{
  "title": "string (optional)",
  "body": "string (required)",
  "recipientId": "string (required)",
  "senderId": "string (required for API Key auth)",
  "extendedData": {}
}
```

**Response (201):**

```json
{
  "id": "string",
  "title": "string",
  "body": "string",
  "senderId": "string",
  "recipientId": "string",
  "read": false,
  "createdAt": "string",
  "updatedAt": "string"
}
```

---

#### `GET /api/v1/private-messages`

Mengambil daftar private messages.

**Query Parameters:**

| Parameter | Type   | Required | Deskripsi                |
| --------- | ------ | -------- | ------------------------ |
| `query`   | string | No       | Search query             |
| `userId`  | string | No       | Filter by user ID        |
| `filter`  | string | No       | Sort: `newest`, `oldest` |
| `cursor`  | string | No       | Pagination cursor        |

**Response (200):**

```json
{
  "privateMessages": [],
  "nextPrivateMessageCursor": "string",
  "count": 0
}
```

---

### 6. 🔔 Notification

| Method   | Endpoint                    | Deskripsi                       |
| -------- | --------------------------- | ------------------------------- |
| `GET`    | `/api/v1/notifications`     | Mengambil daftar notifikasi     |
| `POST`   | `/api/v1/notification`      | Membuat notifikasi baru         |
| `GET`    | `/api/v1/notification/{id}` | Mengambil detail notifikasi     |
| `PATCH`  | `/api/v1/notification/{id}` | Update notifikasi (read status) |
| `DELETE` | `/api/v1/notification/{id}` | Menghapus notifikasi            |
| `PATCH`  | `/api/v1/notifications`     | Bulk update notifications       |

---

#### `GET /api/v1/notifications`

Mengambil daftar notifikasi.

**Query Parameters:**

| Parameter | Type    | Required | Deskripsi                |
| --------- | ------- | -------- | ------------------------ |
| `userId`  | string  | No       | Filter by user ID        |
| `read`    | boolean | No       | Filter by read status    |
| `filter`  | string  | No       | Sort: `newest`, `oldest` |
| `cursor`  | string  | No       | Pagination cursor        |

**Response (200):**

```json
{
  "list": [
    {
      "id": "string",
      "userId": "string",
      "type": "string",
      "read": false,
      "extendedData": {},
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "nextCursor": "string",
  "count": 0
}
```

---

#### `POST /api/v1/notification`

Membuat notifikasi baru.

**Request Body:**

```json
{
  "threadId": "string (optional)",
  "postId": "string (optional)",
  "privateMessageId": "string (optional)",
  "notifierId": "string (required for API Key auth)",
  "notifiedId": "string",
  "type": "string",
  "description": "string",
  "extendedData": {}
}
```

---

### 7. 🏷️ Tag

| Method   | Endpoint                       | Deskripsi                    |
| -------- | ------------------------------ | ---------------------------- |
| `GET`    | `/api/v1/tags`                 | Mengambil daftar tags        |
| `POST`   | `/api/v1/tag`                  | Membuat tag baru             |
| `GET`    | `/api/v1/tag/{id}`             | Mengambil detail tag         |
| `PUT`    | `/api/v1/tag/{id}`             | Memperbarui tag              |
| `DELETE` | `/api/v1/tag/{id}`             | Menghapus tag                |
| `GET`    | `/api/v1/tag/{id}/threads`     | Mengambil threads dengan tag |
| `GET`    | `/api/v1/tag/{id}/subscribers` | Mengambil subscribers tag    |
| `POST`   | `/api/v1/tag/{id}/subscribers` | Subscribe ke tag             |
| `DELETE` | `/api/v1/tag/{id}/subscribers` | Unsubscribe dari tag         |
| `GET`    | `/api/v1/tags/subscribed`      | Mengambil subscribed tags    |

---

#### `GET /api/v1/tags`

Mengambil daftar tags.

**Query Parameters:**

| Parameter | Type   | Required | Deskripsi         |
| --------- | ------ | -------- | ----------------- |
| `query`   | string | No       | Search query      |
| `cursor`  | string | No       | Pagination cursor |

**Response (200):**

```json
{
  "tags": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "color": "string",
      "threads": [],
      "extendedData": {}
    }
  ],
  "nextTagCursor": "string"
}
```

---

#### `POST /api/v1/tag`

Membuat tag baru.

**Request Body:**

```json
{
  "name": "string (required)",
  "description": "string",
  "color": "#hexcolor",
  "extendedData": {}
}
```

---

### 8. 📊 Thread Polls

| Method   | Endpoint                           | Deskripsi                  |
| -------- | ---------------------------------- | -------------------------- |
| `GET`    | `/api/v1/thread/{id}/poll`         | Mengambil poll dari thread |
| `POST`   | `/api/v1/thread/{id}/poll`         | Membuat poll untuk thread  |
| `PUT`    | `/api/v1/thread/{id}/poll`         | Update poll                |
| `DELETE` | `/api/v1/thread/{id}/poll`         | Menghapus poll             |
| `GET`    | `/api/v1/thread/{id}/poll/results` | Mengambil hasil poll       |
| `POST`   | `/api/v1/thread/{id}/poll/votes`   | Cast vote                  |
| `PUT`    | `/api/v1/thread/{id}/poll/votes`   | Change/upsert vote         |
| `DELETE` | `/api/v1/thread/{id}/poll/votes`   | Remove vote                |

---

#### `POST /api/v1/thread/{id}/poll`

Membuat poll untuk thread.

**Request Body:**

```json
{
  "title": "string",
  "expiresAt": "2025-12-31T23:59:59Z",
  "options": [
    {
      "title": "Option 1",
      "color": "#ff0000",
      "extendedData": {}
    },
    {
      "title": "Option 2",
      "color": "#00ff00"
    }
  ],
  "extendedData": {}
}
```

**Response (201):**

```json
{
  "id": "string",
  "title": "string",
  "expiresAt": "string",
  "closed": false,
  "closedAt": null,
  "options": [],
  "createdAt": "string",
  "updatedAt": "string"
}
```

---

#### `GET /api/v1/thread/{id}/poll/results`

Mengambil hasil poll.

**Query Parameters:**

| Parameter | Type   | Required | Deskripsi                         |
| --------- | ------ | -------- | --------------------------------- |
| `userId`  | string | No       | Check which option user voted for |

**Response (200):**

```json
{
  "options": [
    {
      "id": "string",
      "title": "string",
      "color": "string",
      "votes": 10
    }
  ],
  "userVote": "option_id or null"
}
```

---

#### `POST /api/v1/thread/{id}/poll/votes`

Cast vote pada poll.

**Request Body:**

```json
{
  "optionId": "string (required)",
  "userId": "string (required for API Key auth)"
}
```

---

### 9. 👑 Role

| Method   | Endpoint            | Deskripsi              |
| -------- | ------------------- | ---------------------- |
| `GET`    | `/api/v1/roles`     | Mengambil daftar roles |
| `POST`   | `/api/v1/role`      | Membuat role baru      |
| `GET`    | `/api/v1/role/{id}` | Mengambil detail role  |
| `PUT`    | `/api/v1/role/{id}` | Memperbarui role       |
| `DELETE` | `/api/v1/role/{id}` | Menghapus role         |

---

#### `POST /api/v1/role`

Membuat role baru.

**Request Body:**

```json
{
  "name": "string (required)",
  "description": "string",
  "color": "#hexcolor",
  "extendedData": {}
}
```

---

### 10. 🚨 Report

| Method   | Endpoint              | Deskripsi                |
| -------- | --------------------- | ------------------------ |
| `GET`    | `/api/v1/reports`     | Mengambil daftar reports |
| `POST`   | `/api/v1/report`      | Membuat report baru      |
| `GET`    | `/api/v1/report/{id}` | Mengambil detail report  |
| `PUT`    | `/api/v1/report/{id}` | Update report            |
| `PATCH`  | `/api/v1/report/{id}` | Partial update report    |
| `DELETE` | `/api/v1/report/{id}` | Menghapus report         |
| `PATCH`  | `/api/v1/reports`     | Bulk update reports      |

---

#### `POST /api/v1/report`

Membuat report baru.

**Request Body:**

```json
{
  "threadId": "string (optional)",
  "postId": "string (optional)",
  "privateMessageId": "string (optional)",
  "reportedId": "string",
  "reporterId": "string (required for API Key auth)",
  "type": "string",
  "description": "string",
  "extendedData": {}
}
```

---

### 11. 🔍 Search

| Method | Endpoint         | Deskripsi                          |
| ------ | ---------------- | ---------------------------------- |
| `GET`  | `/api/v1/search` | Search tags, posts, threads, users |

---

#### `GET /api/v1/search`

Global search endpoint.

**Query Parameters:**

| Parameter | Type   | Required | Deskripsi                                 |
| --------- | ------ | -------- | ----------------------------------------- |
| `query`   | string | Yes      | Search query                              |
| `type`    | string | Yes      | Type: `threads`, `posts`, `users`, `tags` |
| `cursor`  | string | No       | Pagination cursor                         |

**Response (200):**

```json
{
  "type": "threads",
  "threads": [],
  "posts": [],
  "users": [],
  "tags": [],
  "nextCursor": "string"
}
```

---

### 12. 📈 Stats

| Method | Endpoint        | Deskripsi                    |
| ------ | --------------- | ---------------------------- |
| `GET`  | `/api/v1/stats` | Mengambil statistik instance |

---

#### `GET /api/v1/stats`

Mengambil statistik platform.

**Query Parameters:**

| Parameter      | Type   | Required | Deskripsi                |
| -------------- | ------ | -------- | ------------------------ |
| `filter`       | string | No       | Sort: `newest`, `oldest` |
| `threadCursor` | string | No       | Thread pagination cursor |
| `postCursor`   | string | No       | Post pagination cursor   |
| `userCursor`   | string | No       | User pagination cursor   |
| `reportCursor` | string | No       | Report pagination cursor |

**Response (200):**

```json
{
  "counts": {
    "threads": 0,
    "posts": 0,
    "users": 0,
    "reports": 0
  },
  "latest": [
    {
      "id": "string",
      "createdAt": "string",
      "type": "string"
    }
  ],
  "usage": {},
  "cursors": {
    "threadCursor": "string",
    "postCursor": "string",
    "userCursor": "string",
    "reportCursor": "string"
  }
}
```

---

### 13. 🔗 Integrations

| Method   | Endpoint                                          | Deskripsi             |
| -------- | ------------------------------------------------- | --------------------- |
| `GET`    | `/api/v1/integrations`                            | List all integrations |
| `POST`   | `/api/v1/integrations`                            | Create integration    |
| `GET`    | `/api/v1/integrations/{id}`                       | Get integration by ID |
| `PATCH`  | `/api/v1/integrations/{id}`                       | Update integration    |
| `DELETE` | `/api/v1/integrations/{id}`                       | Delete integration    |
| `GET`    | `/api/v1/integrations/oauth/{provider}/authorize` | Initiate OAuth flow   |
| `GET`    | `/api/v1/integrations/oauth/{provider}/callback`  | OAuth callback        |
| `POST`   | `/api/v1/integrations/test`                       | Test integration      |

---

#### `POST /api/v1/integrations`

Membuat integration baru.

**Request Body:**

```json
{
  "type": "SLACK | DISCORD | SALESFORCE | HUBSPOT | OKTA | AUTH0",
  "name": "string (required)",
  "config": {
    "webhookUrl": "string",
    "channelId": "string"
  }
}
```

**Error Responses:**

- `403` - Feature not available in current tier

---

### 14. 🔐 SSO (Single Sign-On)

| Method   | Endpoint           | Deskripsi           |
| -------- | ------------------ | ------------------- |
| `GET`    | `/api/v1/sso`      | List SSO providers  |
| `POST`   | `/api/v1/sso`      | Create SSO provider |
| `GET`    | `/api/v1/sso/{id}` | Get SSO provider    |
| `PATCH`  | `/api/v1/sso/{id}` | Update SSO provider |
| `DELETE` | `/api/v1/sso/{id}` | Delete SSO provider |

---

#### `POST /api/v1/sso`

Membuat SSO provider baru.

**Request Body:**

```json
{
  "provider": "OKTA | AUTH0 | SAML",
  "domain": "company.com",
  "config": {}
}
```

**Note:** SSO requires ENTERPRISE tier.

---

### 15. 🔔 Webhooks

| Method   | Endpoint                           | Deskripsi                    |
| -------- | ---------------------------------- | ---------------------------- |
| `GET`    | `/api/v1/webhooks`                 | List webhooks                |
| `POST`   | `/api/v1/webhooks`                 | Create webhook               |
| `GET`    | `/api/v1/webhooks/{id}`            | Get webhook by ID            |
| `PATCH`  | `/api/v1/webhooks/{id}`            | Update webhook               |
| `DELETE` | `/api/v1/webhooks/{id}`            | Delete webhook               |
| `GET`    | `/api/v1/webhooks/{id}/deliveries` | Get webhook delivery history |

---

#### `POST /api/v1/webhooks`

Membuat webhook subscription baru.

**Request Body:**

```json
{
  "name": "string (required)",
  "url": "https://your-webhook-url.com/endpoint (required)",
  "events": ["thread.created", "post.created"]
}
```

**Available Webhook Events:**

| Event             | Deskripsi               |
| ----------------- | ----------------------- |
| `thread.created`  | Thread baru dibuat      |
| `thread.updated`  | Thread diperbarui       |
| `thread.deleted`  | Thread dihapus          |
| `post.created`    | Post/reply baru dibuat  |
| `post.updated`    | Post diperbarui         |
| `post.deleted`    | Post dihapus            |
| `user.registered` | User baru mendaftar     |
| `user.updated`    | Profile user diperbarui |
| `poll.voted`      | Suara baru pada polling |
| `report.created`  | Laporan baru dibuat     |

---

## 📦 Data Schemas

### User Schema

```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "displayName": "string",
  "password": "string (write-only)",
  "emailVerified": true,
  "roles": ["string"],
  "bio": "string",
  "signature": "string",
  "url": "string",
  "extendedData": {}
}
```

### Thread Schema

```json
{
  "id": "string",
  "title": "string",
  "slug": "string",
  "body": "string",
  "locked": false,
  "pinned": false,
  "user": {
    "id": "string",
    "username": "string"
  },
  "tags": [],
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Post Schema

```json
{
  "id": "string",
  "body": "string",
  "userId": "string (read-only)",
  "threadId": "string",
  "parentId": "string",
  "bestAnswer": false,
  "likes": [],
  "upvotes": [],
  "extendedData": {},
  "instanceId": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Tag Schema

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "color": "string",
  "threads": [],
  "extendedData": {}
}
```

### Poll Schema

```json
{
  "id": "string",
  "title": "string",
  "expiresAt": "2025-12-31T23:59:59.000Z",
  "closed": false,
  "closedAt": "string",
  "options": [
    {
      "id": "string",
      "title": "string",
      "color": "string",
      "extendedData": {}
    }
  ],
  "extendedData": {},
  "createdAt": "string",
  "updatedAt": "string"
}
```

### PollVote Schema

```json
{
  "id": "string",
  "pollId": "string",
  "optionId": "string",
  "userId": "string",
  "instanceId": "string",
  "createdAt": "string",
  "user": {}
}
```

### PollResults Schema

```json
{
  "options": [
    {
      "id": "string",
      "title": "string",
      "color": "string",
      "votes": 0
    }
  ],
  "userVote": "string | null"
}
```

### Notification Schema

```json
{
  "id": "string",
  "userId": "string",
  "type": "string",
  "read": false,
  "extendedData": {},
  "createdAt": "string",
  "updatedAt": "string"
}
```

### PrivateMessage Schema

```json
{
  "id": "string (read-only)",
  "title": "string",
  "body": "string",
  "senderId": "string (read-only)",
  "recipientId": "string",
  "read": false,
  "extendedData": {},
  "createdAt": "string (read-only)",
  "updatedAt": "string (read-only)"
}
```

### Report Schema

```json
{
  "id": "string",
  "reportedId": "string",
  "reporterId": "string",
  "threadId": "string",
  "postId": "string",
  "privateMessageId": "string",
  "read": false,
  "type": "string",
  "description": "string",
  "instanceId": "string",
  "extendedData": {}
}
```

### Role Schema

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "color": "string",
  "extendedData": {},
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Follow Schema

```json
{
  "id": "string",
  "followerId": "string",
  "followingId": "string",
  "extendedData": {},
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Like Schema

```json
{
  "id": "string",
  "userId": "string",
  "threadId": "string",
  "postId": "string",
  "dislike": false,
  "extendedData": {},
  "createdAt": "string",
  "updatedAt": "string"
}
```

### Upvote Schema

```json
{
  "id": "string",
  "userId": "string",
  "threadId": "string",
  "postId": "string",
  "downvote": false,
  "extendedData": {},
  "createdAt": "string",
  "updatedAt": "string"
}
```

### ThreadSubscription Schema

```json
{
  "threadId": "string",
  "userId": "string",
  "instanceId": "string",
  "extendedData": {}
}
```

---

## ⚠️ Error Responses

### Error Schema

```json
{
  "error": "string",
  "message": "string"
}
```

### ApiError Schema

```json
{
  "message": "Human-readable error message",
  "statusCode": 400,
  "errors": [
    {
      "field": "username",
      "message": "Username is required"
    }
  ]
}
```

### HTTP Status Codes

| Code  | Status                | Deskripsi                                      |
| ----- | --------------------- | ---------------------------------------------- |
| `200` | OK                    | Request berhasil                               |
| `201` | Created               | Resource baru berhasil dibuat                  |
| `204` | No Content            | Request berhasil tanpa response body           |
| `302` | Redirect              | Redirect (OAuth flows)                         |
| `400` | Bad Request           | Request tidak valid                            |
| `401` | Unauthorized          | Autentikasi gagal atau diperlukan              |
| `403` | Forbidden             | Tidak memiliki izin atau feature tier mismatch |
| `404` | Not Found             | Resource tidak ditemukan                       |
| `405` | Method Not Allowed    | HTTP method tidak diizinkan                    |
| `409` | Conflict              | Konflik (e.g., already subscribed)             |
| `422` | Unprocessable Entity  | Kesalahan validasi                             |
| `429` | Too Many Requests     | Rate limit terlampaui                          |
| `500` | Internal Server Error | Kesalahan server internal                      |

---

## 📝 Notes

### Cursor-Based Pagination

Semua list endpoints menggunakan cursor-based pagination. Response akan menyertakan `nextCursor` (atau variasi seperti `nextThreadCursor`, `nextPostCursor`, dll) yang dapat digunakan sebagai parameter `cursor` untuk request selanjutnya.

### Extended Data

Banyak resource mendukung field `extendedData` yang memungkinkan penyimpanan data custom dalam format object JSON.

### Authentication Context

- **API Key Auth**: Gunakan `userId` di request body/query untuk menentukan user context
- **JWT Auth**: User ID otomatis diambil dari token, tidak bisa di-override

### Feature Tiers

Beberapa fitur memerlukan tier tertentu:

- SSO: Requires ENTERPRISE tier
- Webhooks: May have limits based on tier
- Integrations: Some types require higher tiers

---

**Last Updated:** 2025-12-27  
**Source:** https://foru.ms/specs/v1/openapi.json
