# API Console
Version: 1.9.2

## Contact
- **Name:** Foru.ms Support
- **Email:** i@foru.ms
- **URL:** https://foru.ms

## Base URL
- https://foru.ms

## Authentication

### ApiKeyAuth
- **Type:** apiKey
- **Location:** header
- **Parameter Name:** x-api-key

### BearerAuth
- **Type:** http
- **Scheme:** bearer
- **Bearer Format:** JWT


# API Endpoints


# Auth

---
## POST /api/v1/auth/forgot-password
**Summary:** Forgot password
**Description:** Endpoint for requesting a password reset.

**Request Body:** (required)
```
{
  email?: string
}
```

**Responses:**
  **[200]** Password reset token generated successfully
  ```
  {
    resetToken?: string
  }
  ```
  **[400]** Bad request
  ```
  {
    error?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[404]** User not found
  ```
  {
    error?: string
  }
  ```
  **[405]** Method not allowed
  ```
  {
    error?: string
  }
  ```

---
## POST /api/v1/auth/login
**Summary:** User login
**Description:** Endpoint for user login.

**Request Body:** (required)
```
{
  login?: string
  password?: string(password)
}
```

**Responses:**
  **[200]** Successful login
  ```
  {
    token?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[405]** Method not allowed
  ```
  {
    error?: string
  }
  ```

---
## GET /api/v1/auth/me
**Summary:** Get user information
**Description:** Retrieve user information based on the provided JWT token.

**Responses:**
  **[200]** OK. User information retrieved successfully.
  ```
  {
    id?: string // The ID of the user.
    username?: string // The username of the user.
    email?: string // The email of the user.
    displayName?: string // The display name of the user.
    password?: string(password) // The password of the user.
    emailVerified?: boolean // Indicates if the email of the user is verified.
    roles?: string[] // The roles of the user.
    bio?: string // The bio of the user.
    signature?: string // The signature of the user.
    url?: string // The URL of the user.
    extendedData?: object // The extended data of the user.
  }
  ```
  **[401]** Unauthorized. Invalid or missing JWT token.
  ```
  {
    error?: string
    message?: string
  }
  ```

---
## POST /api/v1/auth/register
**Summary:** User registration
**Description:** Endpoint for user registration.

**Request Body:** (required)
```
{
  username: string
  email: string
  displayName?: string
  password: string(password)
  emailVerified?: boolean
  roles?: string[]
  extendedData?: object
}
```

**Responses:**
  **[201]** User created successfully
  ```
  {
    id?: string // The ID of the user.
    username?: string // The username of the user.
    email?: string // The email of the user.
    displayName?: string // The display name of the user.
    password?: string(password) // The password of the user.
    emailVerified?: boolean // Indicates if the email of the user is verified.
    roles?: string[] // The roles of the user.
    bio?: string // The bio of the user.
    signature?: string // The signature of the user.
    url?: string // The URL of the user.
    extendedData?: object // The extended data of the user.
  }
  ```
  **[400]** Bad request
  ```
  {
    error?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[405]** Method not allowed
  ```
  {
    error?: string
  }
  ```

---
## POST /api/v1/auth/reset-password
**Summary:** Reset password
**Description:** Endpoint for resetting a user's password.

**Request Body:** (required)
```
{
  password?: string
  oldPassword?: string
  email?: string
}
```

**Responses:**
  **[200]** Password reset successful
  ```
  {
    message?: string
  }
  ```
  **[400]** Bad request
  ```
  {
    error?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[404]** User not found
  ```
  {
    error?: string
  }
  ```
  **[405]** Method not allowed
  ```
  {
    error?: string
  }
  ```

---
## GET /api/v1/auth/security
**Summary:** Get account security information
**Description:** Retrieve security-related information for the authenticated user, including IP addresses and account activity.
**Auth:** BearerAuth

**Responses:**
  **[200]** OK. Security information retrieved successfully.
  ```
  {
    userId?: string // The user's ID
    username?: string // The user's username
    registrationIp?: string // IP address used during registration
    registrationDate?: string(date-time) // Account creation date
    lastIp?: string // Most recent IP address used
    lastSeenAt?: string(date-time) // Last activity timestamp
    isOnline?: boolean // Current online status
    emailVerified?: boolean // Email verification status
  }
  ```
  **[401]** Unauthorized. Invalid or missing JWT token.
  ```
  {
    error?: string
    message?: string
  }
  ```
  **[405]** Method not allowed.
  ```
  {
    error?: string
    message?: string
  }
  ```


# Integrations

---
## POST /api/v1/integrations
**Summary:** Create integration
**Description:** Create a new integration (Slack, Discord, CRM, SSO)

**Request Body:** (required)
```
{
  type: "SLACK" | "DISCORD" | "SALESFORCE" | "HUBSPOT" | "OKTA" | "AUTH0"
  name: string
  config: object // Integration configuration (will be encrypted)
}
```

**Responses:**
  **[201]** Integration created
  **[403]** Feature not available in current tier

---
## GET /api/v1/integrations
**Summary:** List integrations
**Description:** Get all integrations for the authenticated instance

**Responses:**
  **[200]** OK

---
## PATCH /api/v1/integrations/{id}
**Summary:** Update integration
**Description:** Update an integration's configuration

**Parameters:**
  - `id` [path] string (required): Integration ID

**Request Body:** (required)
```
{
  name?: string // Integration name
  type?: string // Integration type
  enabled?: boolean // Whether the integration is enabled
  config?: object // Integration configuration (will be encrypted)
}
```

**Responses:**
  **[200]** Integration updated successfully
  ```
  {
    integration?: object
  }
  ```
  **[400]** Bad request
  **[404]** Integration not found

---
## DELETE /api/v1/integrations/{id}
**Summary:** Delete integration
**Description:** Delete an integration

**Parameters:**
  - `id` [path] string (required)

**Responses:**
  **[200]** Integration deleted

---
## GET /api/v1/integrations/{id}
**Summary:** Get integration
**Description:** Get integration by ID

**Parameters:**
  - `id` [path] string (required)

**Responses:**
  **[200]** OK
  **[404]** Integration not found

---
## GET /api/v1/integrations/oauth/{provider}/authorize
**Summary:** Initiate OAuth flow
**Description:** Redirect to OAuth provider for authorization

**Parameters:**
  - `provider` [path] "hubspot" | "salesforce" (required)

**Responses:**
  **[302]** Redirect to OAuth provider

---
## GET /api/v1/integrations/oauth/{provider}/callback
**Summary:** OAuth callback
**Description:** Handle OAuth callback from provider

**Parameters:**
  - `provider` [path] string (required)
  - `code` [query] string (required)
  - `state` [query] string (required)

**Responses:**
  **[302]** Redirect to app

---
## POST /api/v1/integrations/test
**Summary:** Test integration
**Description:** Send a test message to verify integration is working

**Request Body:** (required)
```
{
  integrationId: string // Integration ID to test
}
```

**Responses:**
  **[200]** Test message sent successfully
  **[404]** Integration not found
  **[500]** Test failed


# Notification

---
## POST /api/v1/notification
**Summary:** Create a new notification
**Description:** Create a new notification with the provided data

**Request Body:** (required)
```
{
  threadId?: string
  postId?: string
  privateMessageId?: string
  notifierId?: string // ID of the user creating the notification. Required only when using API Key authentication. When using JWT authentication, the notifier ID is automatically extracted from the token and cannot be overridden.
  notifiedId?: string
  type?: string
  description?: string
  extendedData?: object
}
```

**Responses:**
  **[201]** Created
  ```
  {
    id?: string // The ID of the notification.
    userId?: string // The ID of the user who received the notification.
    type?: string // The type of the notification.
    read?: boolean // Indicates if the notification has been read.
    extendedData?: object // Additional data related to the notification.
    createdAt?: string // The date when the notification was created.
    updatedAt?: string // The date when the notification was updated.
  } & {
    read?: boolean
  }
  ```
  **[400]** Bad Request
  ```
  {
    error?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[405]** Method Not Allowed
  ```
  {
    error?: string
  }
  ```

---
## PATCH /api/v1/notification/{id}
**Summary:** Update a notification
**Description:** Update a notification property (e.g. read status)

**Parameters:**
  - `id` [path] string (required): ID of the notification

**Request Body:** (required)
```
{
  userId?: string // User ID to verify ownership. For JWT authentication, automatically uses the authenticated user's ID. For API Key authentication, can be specified in the body.
  read?: boolean // Status to update
}
```

**Responses:**
  **[200]** Successful operation
  ```
  {
    id?: string // The ID of the notification.
    userId?: string // The ID of the user who received the notification.
    type?: string // The type of the notification.
    read?: boolean // Indicates if the notification has been read.
    extendedData?: object // Additional data related to the notification.
    createdAt?: string // The date when the notification was created.
    updatedAt?: string // The date when the notification was updated.
  }
  ```
  **[401]** Unauthorized

---
## DELETE /api/v1/notification/{id}
**Summary:** Delete a notification
**Description:** Delete a notification by its ID

**Parameters:**
  - `id` [path] string (required): ID of the notification
  - `userId` [query] string (optional): User ID to verify ownership. For JWT authentication, automatically uses the authenticated user's ID. For API Key authentication, can be specified in the query.

**Responses:**
  **[200]** Successful operation
  ```
  {
    id?: string // The ID of the notification.
    userId?: string // The ID of the user who received the notification.
    type?: string // The type of the notification.
    read?: boolean // Indicates if the notification has been read.
    extendedData?: object // Additional data related to the notification.
    createdAt?: string // The date when the notification was created.
    updatedAt?: string // The date when the notification was updated.
  } & {
    deleted?: boolean // Indicates if the notification was deleted.
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[500]** Internal Server Error
  ```
  {
    error?: string
  }
  ```

---
## GET /api/v1/notification/{id}
**Summary:** Get a notification
**Description:** Get a notification by its ID

**Parameters:**
  - `id` [path] string (required): ID of the notification
  - `userId` [query] string (optional): User ID to verify ownership. For JWT authentication, automatically uses the authenticated user's ID (users can only access their own notifications). For API Key authentication, can be specified in the query.

**Responses:**
  **[200]** Successful operation
  ```
  {
    id?: string // The ID of the notification.
    userId?: string // The ID of the user who received the notification.
    type?: string // The type of the notification.
    read?: boolean // Indicates if the notification has been read.
    extendedData?: object // Additional data related to the notification.
    createdAt?: string // The date when the notification was created.
    updatedAt?: string // The date when the notification was updated.
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[500]** Internal Server Error
  ```
  {
    error?: string
  }
  ```


# Poll

---
## GET /api/v1/thread/{id}/poll/results
**Summary:** Get poll results
**Description:** Endpoint to get poll results associated with a thread (returns vote counts, not individual votes)

**Parameters:**
  - `id` [path] string (required): The ID of the thread
  - `userId` [query] string (optional): Optional user ID to check which option they voted for. For JWT authentication, automatically uses the authenticated user's ID (private voting - users can only see their own vote). For API Key authentication, can be specified in the query.

**Responses:**
  **[200]** Successful response with the poll results
  ```
  {
    options?: {
      id?: string // The ID of the poll option
      title?: string // The title of the poll option
      color?: string // The color of the poll option
      votes?: integer // The number of votes this option received
    }[]
    userVote?: string // The option ID that the user voted for, or null if they haven't voted
  }
  ```
  **[400]** Thread does not have a poll
  ```
  {
    message: string // Human-readable error message
    statusCode: integer // HTTP status code
    errors?: {
      field: string // Field that failed validation
      message: string // Validation error message
    }[] // Detailed validation errors (optional)
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message: string // Human-readable error message
    statusCode: integer // HTTP status code
    errors?: {
      field: string // Field that failed validation
      message: string // Validation error message
    }[] // Detailed validation errors (optional)
  }
  ```
  **[405]** Method not allowed
  ```
  {
    message: string // Human-readable error message
    statusCode: integer // HTTP status code
    errors?: {
      field: string // Field that failed validation
      message: string // Validation error message
    }[] // Detailed validation errors (optional)
  }
  ```

---
## POST /api/v1/thread/{id}/poll/votes
**Summary:** Cast a new vote
**Description:** Create a vote for a poll option in a thread

**Parameters:**
  - `id` [path] string (required)

**Request Body:** (required)
```
{
  optionId: string // The ID of the poll option to vote for
  userId?: string // User ID casting the vote. Required only when using API Key authentication. When using JWT authentication, the user ID is automatically extracted from the token and cannot be overridden.
}
```

**Responses:**
  **[201]** Vote created successfully
  **[400]** Invalid input or user already voted
  **[401]** Unauthorized
  **[405]** Method not allowed

---
## PUT /api/v1/thread/{id}/poll/votes
**Summary:** Change or upsert a vote
**Description:** Update a user's vote or create it if none exists

**Parameters:**
  - `id` [path] string (required)

**Request Body:** (required)
```
{
  optionId: string // The ID of the poll option to vote for
  userId?: string // User ID changing the vote. Required only when using API Key authentication. When using JWT authentication, the user ID is automatically extracted from the token and cannot be overridden.
}
```

**Responses:**
  **[200]** Vote updated successfully
  **[400]** Invalid input
  **[401]** Unauthorized
  **[405]** Method not allowed

---
## DELETE /api/v1/thread/{id}/poll/votes
**Summary:** Remove a vote
**Description:** Deletes a user's vote for a poll

**Parameters:**
  - `id` [path] string (required)

**Responses:**
  **[204]** Vote deleted successfully
  **[400]** Invalid thread or poll
  **[401]** Unauthorized
  **[405]** Method not allowed


# Post

---
## POST /api/v1/post
**Summary:** Create a new post
**Description:** Endpoint to create a new post.

**Request Body:** (required)
```
{
  body: string
  threadId: string
  userId?: string // User ID creating the post. Required only when using API Key authentication. When using JWT authentication, the user ID is automatically extracted from the token and cannot be overridden.
  parentId?: string
  extendedData?: object
}
```

**Responses:**
  **[201]** Created
  ```
  {
    id?: string // The ID of the post.
    body?: string // The content of the post.
    userId?: string // The ID of the user who created the post.
    threadId?: string // The ID of the thread to which the post belongs.
    parentId?: string // The ID of the parent post.
    bestAnswer?: boolean // Indicates if the post is the best answer.
    likes?: {
      id?: string // The ID of the like.
      userId?: string // The ID of the user who liked the post.
    }[] // The likes received by the post.
    upvotes?: {
      id?: string // The ID of the upvote.
      userId?: string // The ID of the user who upvoted the post.
    }[] // The upvotes received by the post.
    extendedData?: object // The extended data of the post.
    instanceId?: string // The ID of the instance to which the post belongs.
    createdAt?: string // The date when the post was created.
    updatedAt?: string // The date when the post was updated.
  }
  ```
  **[400]** Bad Request
  ```
  {
    error?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[405]** Method Not Allowed
  ```
  {
    error?: string
  }
  ```


# Private Message

---
## POST /api/v1/private-message
**Summary:** Create a private message
**Description:** Endpoint to create a private message.

**Request Body:** (required)
```
{
  title?: string
  body: string
  recipientId: string
  senderId?: string // Sender user ID. Required only when using API Key authentication. When using JWT authentication, the sender ID is automatically extracted from the token and cannot be overridden.
  extendedData?: object
}
```

**Responses:**
  **[201]** Created
  ```
  {
    id?: string // The ID of the private message.
    title?: string // The title of the private message.
    body?: string // The content of the private message.
    senderId?: string // The ID of the user who sent the private message.
    recipientId?: string // The ID of the user who received the private message.
    read?: boolean // Indicates if the private message has been read.
    extendedData?: object // Additional data related to the private message.
    createdAt?: string // The date when the private message was created.
    updatedAt?: string // The date when the private message was updated.
  }
  ```
  **[400]** Bad Request
  ```
  {
    error?: string
    message?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    error?: string
    message?: string
  }
  ```
  **[500]** Internal Server Error
  ```
  {
    error?: string
    message?: string
  }
  ```

---
## POST /api/v1/private-message/{id}
**Summary:** Reply to a private message
**Description:** Reply to a private message by its ID

**Parameters:**
  - `id` [path] string (required): ID of the parent private message.

**Request Body:** (required)
```
{
  id?: string // The ID of the private message.
  title?: string // The title of the private message.
  body?: string // The content of the private message.
  senderId?: string // The ID of the user who sent the private message.
  recipientId?: string // The ID of the user who received the private message.
  read?: boolean // Indicates if the private message has been read.
  extendedData?: object // Additional data related to the private message.
  createdAt?: string // The date when the private message was created.
  updatedAt?: string // The date when the private message was updated.
} & {
  senderId?: string // ID of the user sending the reply. Required only when using API Key authentication. When using JWT authentication, the sender ID is automatically extracted from the token and cannot be overridden.
  title?: string // The title of the private message.
}
```

**Responses:**
  **[201]** Private message created successfully
  ```
  {
    id?: string // The ID of the private message.
    title?: string // The title of the private message.
    body?: string // The content of the private message.
    senderId?: string // The ID of the user who sent the private message.
    recipientId?: string // The ID of the user who received the private message.
    read?: boolean // Indicates if the private message has been read.
    extendedData?: object // Additional data related to the private message.
    createdAt?: string // The date when the private message was created.
    updatedAt?: string // The date when the private message was updated.
  } & {
    title?: string // The title of the private message.
    parentId?: string // The parent ID of the private message.
  }
  ```
  **[400]** Missing required fields or sender and recipient are the same
  ```
  {
    error?: string
    message?: string
  }
  ```

---
## PATCH /api/v1/private-message/{id}
**Summary:** Update a private message
**Description:** Update the content of a private message. Only the sender can update their message.

**Parameters:**
  - `id` [path] string (required): ID of the private message.

**Request Body:** (required)
```
{
  body?: string // Updated message content.
  extendedData?: object // Updated extended data.
}
```

**Responses:**
  **[200]** Private message updated successfully
  ```
  {
    id?: string // The ID of the private message.
    title?: string // The title of the private message.
    body?: string // The content of the private message.
    senderId?: string // The ID of the user who sent the private message.
    recipientId?: string // The ID of the user who received the private message.
    read?: boolean // Indicates if the private message has been read.
    extendedData?: object // Additional data related to the private message.
    createdAt?: string // The date when the private message was created.
    updatedAt?: string // The date when the private message was updated.
  }
  ```
  **[400]** Missing required fields
  **[403]** Forbidden - Only sender can update
  **[404]** Private message not found

---
## DELETE /api/v1/private-message/{id}
**Summary:** Delete a private message by ID
**Description:** Delete a private message by its ID

**Parameters:**
  - `id` [path] string (required): ID of the private message.

**Responses:**
  **[200]** Private message deleted successfully
  ```
  {
    id?: string // The ID of the private message.
    title?: string // The title of the private message.
    body?: string // The content of the private message.
    senderId?: string // The ID of the user who sent the private message.
    recipientId?: string // The ID of the user who received the private message.
    read?: boolean // Indicates if the private message has been read.
    extendedData?: object // Additional data related to the private message.
    createdAt?: string // The date when the private message was created.
    updatedAt?: string // The date when the private message was updated.
  } & {
    deleted?: boolean // Indicates if the private message was deleted.
  }
  ```
  **[404]** Private message not found
  ```
  {
    error?: string
    message?: string
  }
  ```
  **[405]** Method not allowed
  ```
  {
    error?: string
    message?: string
  }
  ```
  **[500]** Internal server error
  ```
  {
    error?: string
    message?: string
  }
  ```

---
## GET /api/v1/private-message/{id}
**Summary:** Get a private message by ID
**Description:** Retrieve a private message by its ID

**Parameters:**
  - `id` [path] string (required): ID of the private message.
  - `userId` [query] string (optional): User ID to verify access. For JWT authentication, automatically uses the authenticated user's ID (users can only access messages they sent or received). For API Key authentication, can be specified in the query.

**Responses:**
  **[200]** Successful operation
  ```
  {
    id?: string // The ID of the private message.
    title?: string // The title of the private message.
    body?: string // The content of the private message.
    senderId?: string // The ID of the user who sent the private message.
    recipientId?: string // The ID of the user who received the private message.
    read?: boolean // Indicates if the private message has been read.
    extendedData?: object // Additional data related to the private message.
    createdAt?: string // The date when the private message was created.
    updatedAt?: string // The date when the private message was updated.
  }
  ```
  **[404]** Private message not found
  ```
  {
    error?: string
    message?: string
  }
  ```


# Report

---
## POST /api/v1/report
**Summary:** Create a report
**Description:** Endpoint to create a report.

**Request Body:** (required)
```
{
  threadId?: string
  postId?: string
  privateMessageId?: string
  reportedId?: string
  reporterId?: string // ID of the user filing the report. Required only when using API Key authentication. When using JWT authentication, the reporter ID is automatically extracted from the token and cannot be overridden.
  type?: string
  description?: string
  extendedData?: object
}
```

**Responses:**
  **[201]** Report created successfully
  ```
  {
    id?: string // The ID of the report.
    reportedId?: string // The ID of the user being reported.
    reporterId?: string // The ID of the user who is reporting.
    threadId?: string // The ID of the reported thread.
    postId?: string // The ID of the post being reported.
    privateMessageId?: string // The ID of the reported private message.
    read?: boolean // Indicates if the report has been read.
    type?: string // The type of the report.
    description?: string // The description of the report.
    instanceId?: string // The ID of the instance.
    extendedData?: object // Additional data related to the report.
  }
  ```
  **[400]** Bad request. Missing required fields.
  ```
  {
    error?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[405]** Method not allowed
  ```
  {
    error?: string
  }
  ```

---
## PUT /api/v1/report/{id}
**Summary:** Update a report
**Description:** Update an existing report.

**Parameters:**
  - `id` [path] string (required): The ID of the report.

**Request Body:** (required)
```
{
  threadId?: string
  postId?: string
  privateMessageId?: string
  reportedId?: string
  reporterId?: string
  type?: string
  description?: string
  read?: boolean
  extendedData?: object
}
```

**Responses:**
  **[200]** OK. Returns the updated report.
  ```
  {
    id?: string // The ID of the report.
    reportedId?: string // The ID of the user being reported.
    reporterId?: string // The ID of the user who is reporting.
    threadId?: string // The ID of the reported thread.
    postId?: string // The ID of the post being reported.
    privateMessageId?: string // The ID of the reported private message.
    read?: boolean // Indicates if the report has been read.
    type?: string // The type of the report.
    description?: string // The description of the report.
    instanceId?: string // The ID of the instance.
    extendedData?: object // Additional data related to the report.
  }
  ```
  **[400]** Bad Request. Invalid request body.
  ```
  {
    message?: string
  }
  ```
  **[404]** Not Found. The requested report does not exist.
  ```
  {
    error?: string
  }
  ```
  **[500]** Internal Server Error. An error occurred while processing the request.
  ```
  {
    error?: string
  }
  ```

---
## PATCH /api/v1/report/{id}
**Summary:** Partially update a report
**Description:** Update specific fields of a report (e.g., read status).

**Parameters:**
  - `id` [path] string (required): The ID of the report.

**Request Body:** (required)
```
{
  read?: boolean
}
```

**Responses:**
  **[200]** OK. Returns the updated report.
  ```
  {
    id?: string // The ID of the report.
    reportedId?: string // The ID of the user being reported.
    reporterId?: string // The ID of the user who is reporting.
    threadId?: string // The ID of the reported thread.
    postId?: string // The ID of the post being reported.
    privateMessageId?: string // The ID of the reported private message.
    read?: boolean // Indicates if the report has been read.
    type?: string // The type of the report.
    description?: string // The description of the report.
    instanceId?: string // The ID of the instance.
    extendedData?: object // Additional data related to the report.
  }
  ```
  **[401]** Unauthorized.
  **[404]** Not Found.

---
## DELETE /api/v1/report/{id}
**Summary:** Delete a report
**Description:** Delete a report by its ID.

**Parameters:**
  - `id` [path] string (required): The ID of the report.

**Responses:**
  **[200]** OK. Returns the deleted report.
  ```
  {
    id?: string // The ID of the report.
    reportedId?: string // The ID of the user being reported.
    reporterId?: string // The ID of the user who is reporting.
    threadId?: string // The ID of the reported thread.
    postId?: string // The ID of the post being reported.
    privateMessageId?: string // The ID of the reported private message.
    read?: boolean // Indicates if the report has been read.
    type?: string // The type of the report.
    description?: string // The description of the report.
    instanceId?: string // The ID of the instance.
    extendedData?: object // Additional data related to the report.
  } & {
    deleted?: boolean // Indicates if the report was deleted.
  }
  ```
  **[500]** Internal Server Error. An error occurred while processing the request.
  ```
  {
    error?: string
  }
  ```

---
## GET /api/v1/report/{id}
**Summary:** Get a report by ID
**Description:** Retrieve a report by its ID.

**Parameters:**
  - `id` [path] string (required): The ID of the report.

**Responses:**
  **[200]** OK. Returns the requested report.
  ```
  {
    id?: string // The ID of the report.
    reportedId?: string // The ID of the user being reported.
    reporterId?: string // The ID of the user who is reporting.
    threadId?: string // The ID of the reported thread.
    postId?: string // The ID of the post being reported.
    privateMessageId?: string // The ID of the reported private message.
    read?: boolean // Indicates if the report has been read.
    type?: string // The type of the report.
    description?: string // The description of the report.
    instanceId?: string // The ID of the instance.
    extendedData?: object // Additional data related to the report.
  }
  ```
  **[401]** Unauthorized. User is not authenticated.
  ```
  {
    message?: string
  }
  ```
  **[404]** Not Found. The requested report does not exist.
  ```
  {
    error?: string
  }
  ```
  **[500]** Internal Server Error. An error occurred while processing the request.
  ```
  {
    error?: string
  }
  ```


# Role

---
## POST /api/v1/role
**Summary:** Create a new role
**Description:** Create a new role with the provided data

**Request Body:** (required)
```
{
  name: string
  description?: string
  color?: string
  extendedData?: object
}
```

**Responses:**
  **[201]** Role created successfully
  ```
  {
    id?: string // The ID of the role.
    name?: string // The name of the role.
    description?: string // The description of the role.
    color?: string // The color of the role.
    extendedData?: object // The extended data of the role.
    createdAt?: string // The date when the role was created.
    updatedAt?: string // The date when the role was updated.
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[500]** Internal server error
  ```
  {
    error?: string
  }
  ```

---
## PUT /api/v1/role/{id}
**Summary:** Update role by ID
**Description:** Update a role by its ID

**Parameters:**
  - `id` [path] string (required): ID of the role

**Request Body:** (required)
```
{
  name?: string
  description?: string
  color?: string
  extendedData?: object
}
```

**Responses:**
  **[200]** Successful operation
  ```
  {
    id?: string // The ID of the role.
    name?: string // The name of the role.
    description?: string // The description of the role.
    color?: string // The color of the role.
    extendedData?: object // The extended data of the role.
    createdAt?: string // The date when the role was created.
    updatedAt?: string // The date when the role was updated.
  }
  ```
  **[400]** Bad Request
  ```
  {
    message?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[500]** Internal Server Error
  ```
  {
    error?: string
  }
  ```

---
## DELETE /api/v1/role/{id}
**Summary:** Delete role by ID
**Description:** Delete a role by its ID

**Parameters:**
  - `id` [path] string (required): ID of the role

**Responses:**
  **[200]** Successful operation
  ```
  {
    id?: string // The ID of the role.
    name?: string // The name of the role.
    description?: string // The description of the role.
    color?: string // The color of the role.
    extendedData?: object // The extended data of the role.
    createdAt?: string // The date when the role was created.
    updatedAt?: string // The date when the role was updated.
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[500]** Internal Server Error
  ```
  {
    error?: string
  }
  ```

---
## GET /api/v1/role/{id}
**Summary:** Get role by ID
**Description:** Retrieve a role by its ID

**Parameters:**
  - `id` [path] string (required): ID of the role

**Responses:**
  **[200]** Successful operation
  ```
  {
    id?: string // The ID of the role.
    name?: string // The name of the role.
    description?: string // The description of the role.
    color?: string // The color of the role.
    extendedData?: object // The extended data of the role.
    createdAt?: string // The date when the role was created.
    updatedAt?: string // The date when the role was updated.
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[500]** Internal Server Error
  ```
  {
    error?: string
  }
  ```


# SSO

---
## POST /api/v1/sso
**Summary:** Create SSO provider
**Description:** Create a new SSO provider configuration

**Request Body:** (required)
```
{
  provider: "OKTA" | "AUTH0" | "SAML"
  domain: string // Email domain (e.g., company.com)
  config: object // SSO configuration (will be encrypted)
}
```

**Responses:**
  **[201]** SSO provider created
  **[403]** SSO requires ENTERPRISE tier

---
## GET /api/v1/sso
**Summary:** List SSO providers
**Description:** Get all SSO providers for the authenticated instance

**Responses:**
  **[200]** OK

---
## PATCH /api/v1/sso/{id}
**Summary:** Update SSO provider
**Description:** Update an SSO provider configuration

**Parameters:**
  - `id` [path] string (required): SSO provider ID

**Request Body:** (required)
```
{
  name?: string // Provider name
  type?: "SAML" | "OIDC" | "OAUTH2" // Provider type
  enabled?: boolean // Whether the provider is enabled
  config?: object // Provider configuration object
}
```

**Responses:**
  **[200]** SSO provider updated successfully
  ```
  SSOProvider
  ```
  **[401]** Unauthorized
  **[403]** Forbidden - Requires ENTERPRISE tier
  **[404]** SSO provider not found

---
## DELETE /api/v1/sso/{id}
**Summary:** Delete SSO provider
**Description:** Delete an SSO provider configuration

**Parameters:**
  - `id` [path] string (required)

**Responses:**
  **[200]** SSO provider deleted
  **[404]** SSO provider not found

---
## GET /api/v1/sso/{id}
**Summary:** Get SSO provider
**Description:** Retrieve details of a specific SSO provider configuration

**Parameters:**
  - `id` [path] string (required): SSO provider ID

**Responses:**
  **[200]** SSO provider retrieved successfully
  ```
  SSOProvider
  ```
  **[401]** Unauthorized
  **[403]** Forbidden - Requires ENTERPRISE tier
  **[404]** SSO provider not found


# Tag

---
## POST /api/v1/tag
**Summary:** Create a new tag
**Description:** Endpoint to create a new tag.

**Request Body:** (required)
```
{
  name: string
  description?: string
  color?: string
  extendedData?: object
}
```

**Responses:**
  **[201]** Tag created successfully
  ```
  {
    id?: string // The ID of the tag.
    name?: string // The name of the tag.
    description?: string // The description of the tag.
    color?: string // The color of the tag.
    threads?: {
      id?: string // The ID of the thread.
      title?: string // The title of the thread.
      slug?: string // The slug of the thread.
      body?: string // The content of the thread.
      locked?: boolean // Indicates if the thread is locked.
      pinned?: boolean // Indicates if the thread is pinned.
      user?: {
        id?: string // The ID of the user.
        username?: string // The username of the user.
      } // The user who created the thread.
      tags?: Tag[] // The tags of the thread.
      createdAt?: string // The date when the thread was created.
      updatedAt?: string // The date when the thread was updated.
    }[] // The threads of the tag.
    extendedData?: object // The extended data of the tag.
  }
  ```
  **[400]** Bad request
  ```
  {
    error?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[405]** Method not allowed
  ```
  {
    error?: string
  }
  ```

---
## PUT /api/v1/tag/{id}
**Summary:** Update tag by ID
**Description:** Update a tag by its ID

**Parameters:**
  - `id` [path] string (required): ID of the tag

**Request Body:** (required)
```
{
  name: string
  description?: string
  color?: string
  extendedData?: object
}
```

**Responses:**
  **[200]** Successful operation
  ```
  {
    id?: string // The ID of the tag.
    name?: string // The name of the tag.
    description?: string // The description of the tag.
    color?: string // The color of the tag.
    threads?: {
      id?: string // The ID of the thread.
      title?: string // The title of the thread.
      slug?: string // The slug of the thread.
      body?: string // The content of the thread.
      locked?: boolean // Indicates if the thread is locked.
      pinned?: boolean // Indicates if the thread is pinned.
      user?: {
        id?: string // The ID of the user.
        username?: string // The username of the user.
      } // The user who created the thread.
      tags?: Tag[] // The tags of the thread.
      createdAt?: string // The date when the thread was created.
      updatedAt?: string // The date when the thread was updated.
    }[] // The threads of the tag.
    extendedData?: object // The extended data of the tag.
  }
  ```
  **[400]** Bad Request
  ```
  {
    message?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[500]** Internal Server Error
  ```
  {
    error?: string
  }
  ```

---
## DELETE /api/v1/tag/{id}
**Summary:** Delete tag by ID
**Description:** Delete a tag by its ID

**Parameters:**
  - `id` [path] string (required): ID of the tag

**Responses:**
  **[200]** Successful operation
  ```
  {
    id?: string // The ID of the tag.
    name?: string // The name of the tag.
    description?: string // The description of the tag.
    color?: string // The color of the tag.
    threads?: {
      id?: string // The ID of the thread.
      title?: string // The title of the thread.
      slug?: string // The slug of the thread.
      body?: string // The content of the thread.
      locked?: boolean // Indicates if the thread is locked.
      pinned?: boolean // Indicates if the thread is pinned.
      user?: {
        id?: string // The ID of the user.
        username?: string // The username of the user.
      } // The user who created the thread.
      tags?: Tag[] // The tags of the thread.
      createdAt?: string // The date when the thread was created.
      updatedAt?: string // The date when the thread was updated.
    }[] // The threads of the tag.
    extendedData?: object // The extended data of the tag.
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[405]** Method Not Allowed
  ```
  {
    error?: string
  }
  ```
  **[500]** Internal Server Error
  ```
  {
    error?: string
  }
  ```

---
## GET /api/v1/tag/{id}
**Summary:** Get tag by ID
**Description:** Retrieve a tag by its ID

**Parameters:**
  - `id` [path] string (required): ID of the tag
  - `userId` [query] string (optional): ID of the user

**Responses:**
  **[200]** Successful operation
  ```
  {
    id?: string // The ID of the tag.
    name?: string // The name of the tag.
    description?: string // The description of the tag.
    color?: string // The color of the tag.
    threads?: {
      id?: string // The ID of the thread.
      title?: string // The title of the thread.
      slug?: string // The slug of the thread.
      body?: string // The content of the thread.
      locked?: boolean // Indicates if the thread is locked.
      pinned?: boolean // Indicates if the thread is pinned.
      user?: {
        id?: string // The ID of the user.
        username?: string // The username of the user.
      } // The user who created the thread.
      tags?: Tag[] // The tags of the thread.
      createdAt?: string // The date when the thread was created.
      updatedAt?: string // The date when the thread was updated.
    }[] // The threads of the tag.
    extendedData?: object // The extended data of the tag.
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[500]** Internal Server Error
  ```
  {
    error?: string
  }
  ```


# Thread

---
## POST /api/v1/thread
**Summary:** Create a new thread
**Description:** Endpoint to create a new thread.

**Request Body:** (required)
```
{
  title?: string
  slug?: string
  body?: string
  userId?: string // User ID creating the thread. Required only when using API Key authentication. When using JWT authentication, the user ID is automatically extracted from the token and cannot be overridden.
  locked?: boolean
  pinned?: boolean
  tags?: string[]
  poll?: {
    title?: string
    options?: {
      color?: string
      title?: string
      extendedData?: object
    }[]
  }
  extendedData?: object
}
```

**Responses:**
  **[201]** Created
  ```
  {
    id?: string // The ID of the thread.
    title?: string // The title of the thread.
    slug?: string // The slug of the thread.
    body?: string // The content of the thread.
    locked?: boolean // Indicates if the thread is locked.
    pinned?: boolean // Indicates if the thread is pinned.
    user?: {
      id?: string // The ID of the user.
      username?: string // The username of the user.
    } // The user who created the thread.
    tags?: {
      id?: string // The ID of the tag.
      name?: string // The name of the tag.
      description?: string // The description of the tag.
      color?: string // The color of the tag.
      threads?: Thread[] // The threads of the tag.
      extendedData?: object // The extended data of the tag.
    }[] // The tags of the thread.
    createdAt?: string // The date when the thread was created.
    updatedAt?: string // The date when the thread was updated.
  }
  ```
  **[400]** Bad Request
  ```
  {
    error?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[405]** Method Not Allowed
  ```
  {
    error?: string
  }
  ```

---
## PUT /api/v1/thread/{id}
**Summary:** Update a thread
**Description:** Update a thread by its ID

**Parameters:**
  - `id` [path] string (required): The ID of the thread

**Request Body:** (required)
```
{
  title?: string
  slug?: string
  body?: string
  userId?: string // User ID updating the thread. Required only when using API Key authentication. When using JWT authentication, the user ID is automatically extracted from the token and cannot be overridden. User must have permission to modify the thread.
  locked?: boolean
  pinned?: boolean
  extendedData?: object
}
```

**Responses:**
  **[200]** OK
  ```
  {
    id?: string // The ID of the thread.
    title?: string // The title of the thread.
    slug?: string // The slug of the thread.
    body?: string // The content of the thread.
    locked?: boolean // Indicates if the thread is locked.
    pinned?: boolean // Indicates if the thread is pinned.
    user?: {
      id?: string // The ID of the user.
      username?: string // The username of the user.
    } // The user who created the thread.
    tags?: {
      id?: string // The ID of the tag.
      name?: string // The name of the tag.
      description?: string // The description of the tag.
      color?: string // The color of the tag.
      threads?: Thread[] // The threads of the tag.
      extendedData?: object // The extended data of the tag.
    }[] // The tags of the thread.
    createdAt?: string // The date when the thread was created.
    updatedAt?: string // The date when the thread was updated.
  }
  ```
  **[400]** Bad Request
  **[401]** Unauthorized
  **[404]** Thread not found
  **[500]** Internal Server Error

---
## DELETE /api/v1/thread/{id}
**Summary:** Delete a thread
**Description:** Delete a thread by its ID

**Parameters:**
  - `id` [path] string (required): The ID of the thread

**Responses:**
  **[200]** OK
  ```
  {
    id?: string // The ID of the thread.
    title?: string // The title of the thread.
    slug?: string // The slug of the thread.
    body?: string // The content of the thread.
    locked?: boolean // Indicates if the thread is locked.
    pinned?: boolean // Indicates if the thread is pinned.
    user?: {
      id?: string // The ID of the user.
      username?: string // The username of the user.
    } // The user who created the thread.
    tags?: {
      id?: string // The ID of the tag.
      name?: string // The name of the tag.
      description?: string // The description of the tag.
      color?: string // The color of the tag.
      threads?: Thread[] // The threads of the tag.
      extendedData?: object // The extended data of the tag.
    }[] // The tags of the thread.
    createdAt?: string // The date when the thread was created.
    updatedAt?: string // The date when the thread was updated.
  }
  ```
  **[401]** Unauthorized
  **[500]** Internal server error
  ```
  {
    error?: string
    message?: string
  }
  ```

---
## GET /api/v1/thread/{id}
**Summary:** Get a thread by ID
**Description:** Retrieve a thread by its ID

**Parameters:**
  - `id` [path] string (required): The ID of the thread

**Responses:**
  **[200]** OK
  ```
  {
    id?: string // The ID of the thread.
    title?: string // The title of the thread.
    slug?: string // The slug of the thread.
    body?: string // The content of the thread.
    locked?: boolean // Indicates if the thread is locked.
    pinned?: boolean // Indicates if the thread is pinned.
    user?: {
      id?: string // The ID of the user.
      username?: string // The username of the user.
    } // The user who created the thread.
    tags?: {
      id?: string // The ID of the tag.
      name?: string // The name of the tag.
      description?: string // The description of the tag.
      color?: string // The color of the tag.
      threads?: Thread[] // The threads of the tag.
      extendedData?: object // The extended data of the tag.
    }[] // The tags of the thread.
    createdAt?: string // The date when the thread was created.
    updatedAt?: string // The date when the thread was updated.
  }
  ```
  **[401]** Unauthorized
  **[404]** Thread not found
  **[500]** Internal Server Error

---
## GET /api/v1/thread/{id}/poll/results
**Summary:** Get poll results
**Description:** Endpoint to get poll results associated with a thread (returns vote counts, not individual votes)

**Parameters:**
  - `id` [path] string (required): The ID of the thread
  - `userId` [query] string (optional): Optional user ID to check which option they voted for. For JWT authentication, automatically uses the authenticated user's ID (private voting - users can only see their own vote). For API Key authentication, can be specified in the query.

**Responses:**
  **[200]** Successful response with the poll results
  ```
  {
    options?: {
      id?: string // The ID of the poll option
      title?: string // The title of the poll option
      color?: string // The color of the poll option
      votes?: integer // The number of votes this option received
    }[]
    userVote?: string // The option ID that the user voted for, or null if they haven't voted
  }
  ```
  **[400]** Thread does not have a poll
  ```
  {
    message: string // Human-readable error message
    statusCode: integer // HTTP status code
    errors?: {
      field: string // Field that failed validation
      message: string // Validation error message
    }[] // Detailed validation errors (optional)
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message: string // Human-readable error message
    statusCode: integer // HTTP status code
    errors?: {
      field: string // Field that failed validation
      message: string // Validation error message
    }[] // Detailed validation errors (optional)
  }
  ```
  **[405]** Method not allowed
  ```
  {
    message: string // Human-readable error message
    statusCode: integer // HTTP status code
    errors?: {
      field: string // Field that failed validation
      message: string // Validation error message
    }[] // Detailed validation errors (optional)
  }
  ```

---
## POST /api/v1/thread/{id}/poll/votes
**Summary:** Cast a new vote
**Description:** Create a vote for a poll option in a thread

**Parameters:**
  - `id` [path] string (required)

**Request Body:** (required)
```
{
  optionId: string // The ID of the poll option to vote for
  userId?: string // User ID casting the vote. Required only when using API Key authentication. When using JWT authentication, the user ID is automatically extracted from the token and cannot be overridden.
}
```

**Responses:**
  **[201]** Vote created successfully
  **[400]** Invalid input or user already voted
  **[401]** Unauthorized
  **[405]** Method not allowed

---
## PUT /api/v1/thread/{id}/poll/votes
**Summary:** Change or upsert a vote
**Description:** Update a user's vote or create it if none exists

**Parameters:**
  - `id` [path] string (required)

**Request Body:** (required)
```
{
  optionId: string // The ID of the poll option to vote for
  userId?: string // User ID changing the vote. Required only when using API Key authentication. When using JWT authentication, the user ID is automatically extracted from the token and cannot be overridden.
}
```

**Responses:**
  **[200]** Vote updated successfully
  **[400]** Invalid input
  **[401]** Unauthorized
  **[405]** Method not allowed

---
## DELETE /api/v1/thread/{id}/poll/votes
**Summary:** Remove a vote
**Description:** Deletes a user's vote for a poll

**Parameters:**
  - `id` [path] string (required)

**Responses:**
  **[204]** Vote deleted successfully
  **[400]** Invalid thread or poll
  **[401]** Unauthorized
  **[405]** Method not allowed


# Thread - Poll

---
## POST /api/v1/thread/{id}/poll
**Summary:** Create a poll for a thread
**Description:** Create a poll for a thread with the specified ID

**Parameters:**
  - `id` [path] string (required): The ID of the thread

**Request Body:** (required)
```
{
  title?: string // The title of the poll
  expiresAt?: string(date-time) // The expiration date and time of the poll
  options?: {
    title?: string // The title of the poll option
    color?: string // The color of the poll option
    extendedData?: object // Additional data for the poll option
  }[]
  extendedData?: object // Additional data for the poll
}
```

**Responses:**
  **[201]** Poll created successfully
  ```
  {
    id?: string // The ID of the poll.
    title?: string // The title of the poll.
    expiresAt?: string(date-time) // The expiration date and time of the poll.
    closed?: boolean // Indicates if the poll is closed.
    closedAt?: string(date-time) // The closed date and time of the poll.
    options?: {
      id?: string // The ID of the poll option.
      title?: string // The title of the poll option.
      color?: string // The color of the poll option.
      extendedData?: object // The additional data for the poll option.
    }[]
    extendedData?: object // The additional data for the poll.
    createdAt?: string // The date when the poll was created.
    updatedAt?: string // The date when the poll was updated.
  } & {
    closed?: boolean // Indicates if the poll was closed
    closedAt?: string(date-time) // The closed date and time of the poll
  }
  ```
  **[400]** Bad request. Missing required fields or invalid data
  ```
  {
    message?: string // Error message
  }
  ```
  **[401]** Unauthorized. User is not subscribed
  ```
  {
    message?: string // Error message
  }
  ```
  **[404]** Thread not found
  ```
  {
    message?: string // Error message
  }
  ```
  **[405]** Method not allowed
  ```
  {
    message?: string // Error message
  }
  ```

---
## PUT /api/v1/thread/{id}/poll
**Summary:** Update the poll for a thread
**Description:** Update the poll for a thread with the specified ID

**Parameters:**
  - `id` [path] string (required): The ID of the thread

**Request Body:** (required)
```
{
  title?: string // The updated title of the poll
  expiresAt?: string(date-time) // The updated expiration date and time of the poll
  closed?: boolean // Indicates if the poll is closed
  options?: {
    id?: string // The ID of the poll option
    title?: string // The updated title of the poll option
    color?: string // The updated color of the poll option
    extendedData?: object // The updated additional data for the poll option
  }[]
  extendedData?: object // The updated additional data for the poll
}
```

**Responses:**
  **[200]** Poll updated successfully
  ```
  {
    id?: string // The ID of the poll.
    title?: string // The title of the poll.
    expiresAt?: string(date-time) // The expiration date and time of the poll.
    closed?: boolean // Indicates if the poll is closed.
    closedAt?: string(date-time) // The closed date and time of the poll.
    options?: {
      id?: string // The ID of the poll option.
      title?: string // The title of the poll option.
      color?: string // The color of the poll option.
      extendedData?: object // The additional data for the poll option.
    }[]
    extendedData?: object // The additional data for the poll.
    createdAt?: string // The date when the poll was created.
    updatedAt?: string // The date when the poll was updated.
  }
  ```
  **[400]** Bad request. Missing required fields or invalid data
  ```
  {
    message?: string // Error message
  }
  ```
  **[401]** Unauthorized. User is not subscribed
  ```
  {
    message?: string // Error message
  }
  ```
  **[404]** Poll not found
  ```
  {
    message?: string // Error message
  }
  ```

---
## DELETE /api/v1/thread/{id}/poll
**Summary:** Delete the poll for a thread
**Description:** Delete the poll for a thread with the specified ID

**Parameters:**
  - `id` [path] string (required): The ID of the thread

**Responses:**
  **[200]** Poll deleted successfully
  ```
  {
    id?: string // The ID of the poll.
    title?: string // The title of the poll.
    expiresAt?: string(date-time) // The expiration date and time of the poll.
    closed?: boolean // Indicates if the poll is closed.
    closedAt?: string(date-time) // The closed date and time of the poll.
    options?: {
      id?: string // The ID of the poll option.
      title?: string // The title of the poll option.
      color?: string // The color of the poll option.
      extendedData?: object // The additional data for the poll option.
    }[]
    extendedData?: object // The additional data for the poll.
    createdAt?: string // The date when the poll was created.
    updatedAt?: string // The date when the poll was updated.
  } & {
    deleted?: boolean // Indicates if the poll was deleted.
  }
  ```
  **[401]** Unauthorized. User is not subscribed
  ```
  {
    message?: string // Error message
  }
  ```
  **[404]** Poll not found
  ```
  {
    message?: string // Error message
  }
  ```
  **[405]** Method not allowed
  ```
  {
    message?: string // Error message
  }
  ```

---
## GET /api/v1/thread/{id}/poll
**Summary:** Get the poll for a thread
**Description:** Get the poll for a thread with the specified ID

**Parameters:**
  - `id` [path] string (required): The ID of the thread

**Responses:**
  **[200]** Poll retrieved successfully
  ```
  {
    id?: string // The ID of the poll.
    title?: string // The title of the poll.
    expiresAt?: string(date-time) // The expiration date and time of the poll.
    closed?: boolean // Indicates if the poll is closed.
    closedAt?: string(date-time) // The closed date and time of the poll.
    options?: {
      id?: string // The ID of the poll option.
      title?: string // The title of the poll option.
      color?: string // The color of the poll option.
      extendedData?: object // The additional data for the poll option.
    }[]
    extendedData?: object // The additional data for the poll.
    createdAt?: string // The date when the poll was created.
    updatedAt?: string // The date when the poll was updated.
  }
  ```
  **[401]** Unauthorized. User is not subscribed
  ```
  {
    message?: string // Error message
  }
  ```
  **[404]** Poll not found
  ```
  {
    message?: string // Error message
  }
  ```


# User

---
## POST /api/v1/user
**Summary:** Create a new user
**Description:** Endpoint to create a new user.

**Request Body:** (required)
```
{
  username: string
  email: string
  displayName?: string
  password: string(password)
  emailVerified?: boolean
  roles?: string[]
  bio?: string
  signature?: string
  url?: string
  extendedData?: object
}
```

**Responses:**
  **[201]** User created successfully
  ```
  {
    id?: string // The ID of the user.
    username?: string // The username of the user.
    email?: string // The email of the user.
    displayName?: string // The display name of the user.
    password?: string(password) // The password of the user.
    emailVerified?: boolean // Indicates if the email of the user is verified.
    roles?: string[] // The roles of the user.
    bio?: string // The bio of the user.
    signature?: string // The signature of the user.
    url?: string // The URL of the user.
    extendedData?: object // The extended data of the user.
  }
  ```
  **[400]** Bad request
  ```
  {
    error?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    message?: string
  }
  ```
  **[405]** Method not allowed
  ```
  {
    error?: string
  }
  ```

---
## PUT /api/v1/user/{id}
**Summary:** Update user by ID
**Description:** Update user information by ID

**Parameters:**
  - `id` [path] string (required): ID of the user

**Request Body:** (required)
```
{
  username?: string
  email?: string
  displayName?: string
  password?: string(password)
  emailVerified?: boolean
  roles?: string[]
  bio?: string
  signature?: string
  url?: string
  extendedData?: object
}
```

**Responses:**
  **[200]** Successful operation
  ```
  {
    id?: string // The ID of the user.
    username?: string // The username of the user.
    email?: string // The email of the user.
    displayName?: string // The display name of the user.
    password?: string(password) // The password of the user.
    emailVerified?: boolean // Indicates if the email of the user is verified.
    roles?: string[] // The roles of the user.
    bio?: string // The bio of the user.
    signature?: string // The signature of the user.
    url?: string // The URL of the user.
    extendedData?: object // The extended data of the user.
  }
  ```
  **[400]** Bad request
  ```
  {
    error?: string
    message?: string
  }
  ```
  **[401]** Unauthorized
  ```
  {
    error?: string
    message?: string
  }
  ```
  **[500]** Internal server error
  ```
  {
    error?: string
    message?: string
  }
  ```

---
## DELETE /api/v1/user/{id}
**Summary:** Delete user by ID
**Description:** Delete user by ID

**Parameters:**
  - `id` [path] string (required): ID of the user

**Responses:**
  **[200]** Successful operation
  ```
  {
    id?: string // The ID of the user.
    username?: string // The username of the user.
    email?: string // The email of the user.
    displayName?: string // The display name of the user.
    password?: string(password) // The password of the user.
    emailVerified?: boolean // Indicates if the email of the user is verified.
    roles?: string[] // The roles of the user.
    bio?: string // The bio of the user.
    signature?: string // The signature of the user.
    url?: string // The URL of the user.
    extendedData?: object // The extended data of the user.
  }
  ```
  **[500]** Internal server error
  ```
  {
    error?: string
    message?: string
  }
  ```

---
## GET /api/v1/user/{id}
**Summary:** Get user by ID
**Description:** Retrieve user information by ID

**Parameters:**
  - `id` [path] string (required): ID of the user

**Responses:**
  **[200]** Successful operation
  ```
  {
    id?: string // The ID of the user.
    username?: string // The username of the user.
    email?: string // The email of the user.
    displayName?: string // The display name of the user.
    password?: string(password) // The password of the user.
    emailVerified?: boolean // Indicates if the email of the user is verified.
    roles?: string[] // The roles of the user.
    bio?: string // The bio of the user.
    signature?: string // The signature of the user.
    url?: string // The URL of the user.
    extendedData?: object // The extended data of the user.
  }
  ```
  **[401]** Unauthorized
  ```
  {
    error?: string
    message?: string
  }
  ```
  **[404]** User not found
  ```
  {
    error?: string
    message?: string
  }
  ```
  **[500]** Internal server error
  ```
  {
    error?: string
    message?: string
  }
  ```


# Votes

---
## PUT /api/v1/thread/{id}/poll/votes
**Summary:** Change or upsert a vote
**Description:** Update a user's vote or create it if none exists

**Parameters:**
  - `id` [path] string (required)

**Request Body:** (required)
```
{
  optionId: string // The ID of the poll option to vote for
  userId?: string // User ID changing the vote. Required only when using API Key authentication. When using JWT authentication, the user ID is automatically extracted from the token and cannot be overridden.
}
```

**Responses:**
  **[200]** Vote updated successfully
  **[400]** Invalid input
  **[401]** Unauthorized
  **[405]** Method not allowed

---
## DELETE /api/v1/thread/{id}/poll/votes
**Summary:** Remove a vote
**Description:** Deletes a user's vote for a poll

**Parameters:**
  - `id` [path] string (required)

**Responses:**
  **[204]** Vote deleted successfully
  **[400]** Invalid thread or poll
  **[401]** Unauthorized
  **[405]** Method not allowed


# Webhooks

---
## POST /api/v1/webhooks
**Summary:** Create webhook
**Description:** Create a new webhook subscription

**Request Body:** (required)
```
{
  name: string // Webhook name
  url: string(uri) // Webhook URL
  events: string[] // Array of event types to subscribe to
}
```

**Responses:**
  **[201]** Webhook created successfully
  **[400]** Bad request
  **[403]** Webhook limit exceeded

---
## GET /api/v1/webhooks
**Summary:** List webhooks
**Description:** Get all webhooks for the authenticated instance

**Responses:**
  **[200]** OK. Returns the list of webhooks.
  ```
  {
    webhooks?: object[]
  }
  ```
  **[401]** Unauthorized

---
## PATCH /api/v1/webhooks/{id}
**Summary:** Update webhook
**Description:** Update webhook configuration

**Parameters:**
  - `id` [path] string (required)

**Request Body:** (optional)
```
{
  name?: string
  url?: string
  events?: string[]
  active?: boolean
}
```

**Responses:**
  **[200]** Webhook updated
  **[404]** Webhook not found

---
## DELETE /api/v1/webhooks/{id}
**Summary:** Delete webhook
**Description:** Delete a webhook

**Parameters:**
  - `id` [path] string (required)

**Responses:**
  **[200]** Webhook deleted
  **[404]** Webhook not found

---
## GET /api/v1/webhooks/{id}
**Summary:** Get webhook
**Description:** Get a webhook by ID

**Parameters:**
  - `id` [path] string (required): Webhook ID

**Responses:**
  **[200]** OK
  **[404]** Webhook not found


---

# Common Schemas

## User
```
{
  id?: string // The ID of the user.
  username?: string // The username of the user.
  email?: string // The email of the user.
  displayName?: string // The display name of the user.
  password?: string(password) // The password of the user.
  emailVerified?: boolean // Indicates if the email of the user is verified.
  roles?: string[] // The roles of the user.
  bio?: string // The bio of the user.
  signature?: string // The signature of the user.
  url?: string // The URL of the user.
  extendedData?: object // The extended data of the user.
}
```

## Follow
```
{
  id?: string // The ID of the follower.
  followerId?: string // The ID of the follower.
  followingId?: string // The ID of the user being followed.
  extendedData?: object // The extended data of the follower.
  createdAt?: string // The date when the follower was created.
  updatedAt?: string // The date when the follower was updated.
}
```

## Tag
```
{
  id?: string // The ID of the tag.
  name?: string // The name of the tag.
  description?: string // The description of the tag.
  color?: string // The color of the tag.
  threads?: {
    id?: string // The ID of the thread.
    title?: string // The title of the thread.
    slug?: string // The slug of the thread.
    body?: string // The content of the thread.
    locked?: boolean // Indicates if the thread is locked.
    pinned?: boolean // Indicates if the thread is pinned.
    user?: {
      id?: string // The ID of the user.
      username?: string // The username of the user.
    } // The user who created the thread.
    tags?: {
      id?: string // The ID of the tag.
      name?: string // The name of the tag.
      description?: string // The description of the tag.
      color?: string // The color of the tag.
      threads?: Thread[] // The threads of the tag.
      extendedData?: object // The extended data of the tag.
    }[] // The tags of the thread.
    createdAt?: string // The date when the thread was created.
    updatedAt?: string // The date when the thread was updated.
  }[] // The threads of the tag.
  extendedData?: object // The extended data of the tag.
}
```

## Thread
```
{
  id?: string // The ID of the thread.
  title?: string // The title of the thread.
  slug?: string // The slug of the thread.
  body?: string // The content of the thread.
  locked?: boolean // Indicates if the thread is locked.
  pinned?: boolean // Indicates if the thread is pinned.
  user?: {
    id?: string // The ID of the user.
    username?: string // The username of the user.
  } // The user who created the thread.
  tags?: {
    id?: string // The ID of the tag.
    name?: string // The name of the tag.
    description?: string // The description of the tag.
    color?: string // The color of the tag.
    threads?: {
      id?: string // The ID of the thread.
      title?: string // The title of the thread.
      slug?: string // The slug of the thread.
      body?: string // The content of the thread.
      locked?: boolean // Indicates if the thread is locked.
      pinned?: boolean // Indicates if the thread is pinned.
      user?: {
        id?: string // The ID of the user.
        username?: string // The username of the user.
      } // The user who created the thread.
      tags?: Tag[] // The tags of the thread.
      createdAt?: string // The date when the thread was created.
      updatedAt?: string // The date when the thread was updated.
    }[] // The threads of the tag.
    extendedData?: object // The extended data of the tag.
  }[] // The tags of the thread.
  createdAt?: string // The date when the thread was created.
  updatedAt?: string // The date when the thread was updated.
}
```

## Like
```
{
  id?: string // The ID of the like.
  userId?: string // The ID of the user who liked the thread.
  threadId?: string // The ID of the thread.
  postId?: string // The ID of the post.
  dislike?: boolean // Indicates if the like is a dislike.
  extendedData?: object // The extended data of the like.
  createdAt?: string // The date when the like was created.
  updatedAt?: string // The date when the like was updated.
}
```

## Upvote
```
{
  id?: string // The ID of the upvote.
  userId?: string // The ID of the user who upvoted the thread.
  threadId?: string // The ID of the thread.
  postId?: string // The ID of the post.
  downvote?: boolean // Indicates if the upvote is a downvote.
  extendedData?: object // The extended data of the upvote.
  createdAt?: string // The date when the upvote was created.
  updatedAt?: string // The date when the upvote was updated.
}
```

## Poll
```
{
  id?: string // The ID of the poll.
  title?: string // The title of the poll.
  expiresAt?: string(date-time) // The expiration date and time of the poll.
  closed?: boolean // Indicates if the poll is closed.
  closedAt?: string(date-time) // The closed date and time of the poll.
  options?: {
    id?: string // The ID of the poll option.
    title?: string // The title of the poll option.
    color?: string // The color of the poll option.
    extendedData?: object // The additional data for the poll option.
  }[]
  extendedData?: object // The additional data for the poll.
  createdAt?: string // The date when the poll was created.
  updatedAt?: string // The date when the poll was updated.
}
```

## Post
```
{
  id?: string // The ID of the post.
  body?: string // The content of the post.
  userId?: string // The ID of the user who created the post.
  threadId?: string // The ID of the thread to which the post belongs.
  parentId?: string // The ID of the parent post.
  bestAnswer?: boolean // Indicates if the post is the best answer.
  likes?: {
    id?: string // The ID of the like.
    userId?: string // The ID of the user who liked the post.
  }[] // The likes received by the post.
  upvotes?: {
    id?: string // The ID of the upvote.
    userId?: string // The ID of the user who upvoted the post.
  }[] // The upvotes received by the post.
  extendedData?: object // The extended data of the post.
  instanceId?: string // The ID of the instance to which the post belongs.
  createdAt?: string // The date when the post was created.
  updatedAt?: string // The date when the post was updated.
}
```

## Report
```
{
  id?: string // The ID of the report.
  reportedId?: string // The ID of the user being reported.
  reporterId?: string // The ID of the user who is reporting.
  threadId?: string // The ID of the reported thread.
  postId?: string // The ID of the post being reported.
  privateMessageId?: string // The ID of the reported private message.
  read?: boolean // Indicates if the report has been read.
  type?: string // The type of the report.
  description?: string // The description of the report.
  instanceId?: string // The ID of the instance.
  extendedData?: object // Additional data related to the report.
}
```

## ThreadSubscription
```
{
  threadId?: string // The ID of the subscribed thread.
  userId?: string // The ID of the user who subscribed to the thread.
  instanceId?: string // The ID of the instance associated with the subscription.
  extendedData?: object // Optional extended data associated with the subscription.
}
```


_... and 10 more schemas_

---

_Generated on 2025-12-28T04:07:16.729Z_
