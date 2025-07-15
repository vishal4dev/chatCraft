# chatCraft
A web-based chatbot application powered by Azure OpenAI with multiple conversation modes and personality settings.

## Features

- **Multiple Conversation Modes**: General, Story, Learning, Interview, and Debate
- **Personality Settings**: Neutral, Humorous, Stoic, Friendly, and Professional
- **Conversation History**: Maintains context across messages
- **Real-time Chat**: Instant responses with typing indicators
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Node.js (version 16 or higher)
- Azure OpenAI account and API key
- NPM package manager

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd azure-ai-chatbot
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the root directory with:
```
AZURE_OPENAI_API_KEY=your_actual_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
DEPLOYMENT_NAME=your_deployment_name
PORT=5000
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to `http://localhost:5000`

3. Start chatting with the AI assistant!

## API Endpoints

- `GET /` - Server status
- `POST /chat` - Send message to AI
- `POST /clear` - Clear conversation history
- `POST /set_preferences` - Update mode and personality
- `GET /get_preferences` - Get current preferences
- `GET /modes` - Get available modes and personalities
- `GET /health` - Health check

## Available Modes

- **General**: Standard helpful assistant
- **Story**: Creative storytelling and narrative development
- **Learning**: Educational tutor with interactive teaching
- **Interview**: Job interview preparation and practice
- **Debate**: Structured debate partner

## Available Personalities

- **Neutral**: Standard responses
- **Humorous**: Witty and light-hearted
- **Stoic**: Calm and philosophical
- **Friendly**: Warm and encouraging
- **Professional**: Formal and business-like

## Development

For development with auto-restart:
```bash
npm run dev
```

## File Structure

```
azure-ai-chatbot/
├── app.js              # Main server file
├── package.json        # Dependencies and scripts
├── .env               # Environment variables (create this)
├── index.html         # Frontend interface
└── README.md          # This file
```

## Configuration

The application uses Azure OpenAI API. Make sure to:
1. Create an Azure OpenAI resource
2. Deploy a model (e.g., GPT-3.5-turbo)
3. Get your API key and endpoint
4. Update the `.env` file with your credentials
