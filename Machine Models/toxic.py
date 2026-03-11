import re
import pickle
import numpy as np
import torch
import torch.nn as nn
import spacy

print("Loading spaCy model...")
nlp = spacy.load("en_core_web_md")


def processing_text(text: str) -> str:
    text = re.sub(r'@\w+', '', text)               
    text = re.sub(r'http\S+|www.\S+', '', text)    
    text = text.lower()

    replacements = [
        (r'\b(?:f+u*c*k+[eioa]*n*g*)\b', 'fuck'),
        (r'\b(?:s+h*i*t+)\b', 'shit'),
        (r'\b(?:b+i*t*c*h+)\b', 'bitch'),
        (r'\b(?:a+s*s+)\b', 'ass'),
        (r'\b(?:d+i*c*k+)\b', 'dick'),
        (r'\b(?:n+i*g*g*a+)\b', 'nigger'),
        (r'\b(?:c+u*n*t+)\b', 'cunt'),
        (r'\b(?:d+a*m*n+)\b', 'damn'),
        (r'\b(?:h+e*l*l+)\b', 'hell'),
        (r'\b(?:m+o*t*h*e*r*f*u*c*k*e*r+)\b', 'motherfucker'),
        (r'\b(?:w+h*o*r+e+)\b', 'whore'),
        (r'\b(?:s+l+u*t+)\b', 'slut'),
        (r'\b(?:r+e*t+a*r+d+)\b', 'retard'),
        (r'\b(?:g+a*y+)\b', 'gay'),
    ]
    for pattern, repl in replacements:
        text = re.sub(pattern, repl, text)

    doc = nlp(text)
    tokens = [token.text.strip() for token in doc if token.text.strip()]

    return ' '.join(tokens)



print("Loading vocabulary and label encoder...")

with open('vocab.pkl', 'rb') as f:
    vocab = pickle.load(f)

with open('label_encoder.pkl', 'rb') as f:
    le = pickle.load(f)

vocab_size = len(vocab)
MAX_LEN = 150
OOV_IDX = vocab.get("<OOV>", 0)
PAD_IDX = 0


def text_to_sequence(text: str) -> list:
    return [vocab.get(word, OOV_IDX) for word in text.split()]


def pad_sequence(seq: list, maxlen: int = MAX_LEN) -> list:
    if len(seq) > maxlen:
        return seq[:maxlen]
    return seq + [PAD_IDX] * (maxlen - len(seq))



class ToxicityModel(nn.Module):
    def __init__(self, vocab_size, embed_dim=300, hidden_dim=64, dropout=0.3):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=PAD_IDX)
        self.bilstm = nn.LSTM(
            embed_dim, hidden_dim,
            bidirectional=True, batch_first=True
        )
        self.layer_norm = nn.LayerNorm(hidden_dim * 2)
        self.dropout1 = nn.Dropout(dropout)

        self.attention = nn.MultiheadAttention(
            embed_dim=hidden_dim*2,
            num_heads=4,
            dropout=0.1,
            batch_first=True
        )

        self.pool = nn.AdaptiveAvgPool1d(1)

        self.fc1 = nn.Linear(hidden_dim * 2, 32)
        self.dropout2 = nn.Dropout(dropout)
        self.fc2 = nn.Linear(32, 2)

    def forward(self, x):
        emb = self.embedding(x)
        lstm_out, _ = self.bilstm(emb)
        lstm_out = self.layer_norm(lstm_out)
        lstm_out = self.dropout1(lstm_out)

        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)

        out = attn_out.permute(0, 2, 1)          
        out = self.pool(out).squeeze(-1)        

        out = torch.relu(self.fc1(out))
        out = self.dropout2(out)
        logits = self.fc2(out)
        return logits



print("Loading model weights...")

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = ToxicityModel(vocab_size=vocab_size, embed_dim=300).to(device)

state_dict = torch.load("best_toxicity_model.pt", map_location=device)
model.load_state_dict(state_dict)
model.eval()

print("Model loaded successfully ✓")


def predict_toxicity(text: str, return_probabilities=False):

    processed = processing_text(text)
    seq = text_to_sequence(processed)
    padded = pad_sequence(seq)
    
    
    tensor = torch.LongTensor([padded]).to(device)
    
    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0].cpu().numpy()
    
    pred_idx = int(np.argmax(probs))
    label = le.inverse_transform([pred_idx])[0]
    label_str = "Toxic" if label == 1 else "Non-Toxic"
    
    result = {
        "input_text": text,
        "processed_text": processed,
        "predicted_label": label_str,
        "prediction_int": pred_idx,           
    }
    
    if return_probabilities:
        result["confidence_non_toxic"] = float(probs[0])
        result["confidence_toxic"]     = float(probs[1])
    
    return result


if __name__ == "__main__":
    sentance=input()
    result = predict_toxicity(sentance, return_probabilities=True)
    print(f"Prediction: {result['predicted_label']}")