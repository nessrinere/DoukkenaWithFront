import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Product {
  Id: number;
  Name: string;
  Price: number;
  ShortDescription: string;
  FullDescription: string;
  Published: boolean;
}

interface LMStudioRequest {
  model: string;
  messages: { role: string; content: string }[];
  temperature: number;
  max_tokens: number;
  stream: boolean;
}

interface LMStudioResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  isOpen = false;
  isLoading = false;
  messages: ChatMessage[] = [];
  userInput = '';
  products: Product[] = [];
  
  private readonly PRODUCTS_API = 'https://localhost:59579/api/products';
  private readonly LM_STUDIO_API = 'http://localhost:1234/v1/chat/completions';
  private readonly MODEL_NAME = 'deepseek/deepseek-r1-0528-qwen3-8b';
  
  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadProducts();
    this.initializeChat();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private loadProducts(): void {
    this.http.get<Product[]>(this.PRODUCTS_API)
      .pipe(
        catchError(error => {
          console.error('Error loading products:', error);
          return of([]);
        })
      )
      .subscribe(products => {
        this.products = products.filter(p => p.Published);
      });
  }

  private initializeChat(): void {
    this.messages = [
      {
        role: 'assistant',
        content: 'Hello! I\'m here to help you with questions about our products. What would you like to know?',
        timestamp: new Date()
      }
    ];
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
  }

  sendMessage(): void {
    if (!this.userInput.trim() || this.isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: this.userInput.trim(),
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    const currentInput = this.userInput;
    this.userInput = '';
    this.isLoading = true;

    this.getAIResponse(currentInput);
  }

  private getAIResponse(userQuestion: string): void {
    const systemPrompt = this.buildSystemPrompt();
    
    const request: LMStudioRequest = {
      model: this.MODEL_NAME,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userQuestion }
      ],
      temperature: 0.7,
      max_tokens: -1,
      stream: false
    };

    this.http.post<LMStudioResponse>(this.LM_STUDIO_API, request)
      .pipe(
        catchError(error => {
          console.error('Error calling LM Studio:', error);
          return of({
            choices: [{
              message: {
                content: 'I apologize, but I\'m having trouble connecting to the AI service right now. Please try again later or contact our support team for assistance.'
              }
            }]
          } as LMStudioResponse);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe(response => {
        const cleaned = response.choices[0]?.message?.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: cleaned || 'I apologize, but I couldn\'t generate a response. Please try again.',
          timestamp: new Date()
        };
        
        this.messages.push(aiMessage);
      });
  }
  
  private buildSystemPrompt(): string {
    const productsInfo = this.products.map(product => 
      `- ${product.Name} (ID: ${product.Id}): $${product.Price} - ${product.ShortDescription}`
    ).join('\n');

    return `You are a helpful customer service assistant for an e-commerce website. Your role is to help customers find products and answer questions about our inventory.

Available Products:
${productsInfo}

Instructions:
- Always be friendly, helpful, and professional
- Focus on helping customers find the right products
- If asked about specific products, provide details including name, price, and description
- If a customer asks about products not in our inventory, politely let them know we don't currently carry that item
- For general questions about shopping, shipping, returns, etc., provide helpful general guidance
- Keep responses concise but informative
- If you're unsure about something specific to the business policies, suggest they contact customer support

Remember: You can only provide information about the products listed above. Be honest if you don't have specific information.`;
  }

  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.initializeChat();
  }
}
