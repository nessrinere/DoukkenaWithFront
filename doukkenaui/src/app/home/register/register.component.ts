import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  @Output() close = new EventEmitter<void>();
  @Output() switchToLogin = new EventEmitter<void>();
   registerForm: FormGroup;
  submittedLogin = false;
  showRegisterPopup = false;
  showLoginPopup: boolean=false;
  registerSubmitted = false;
  registerError: string = '';

  constructor(private fb: FormBuilder, private https: HttpClient, private router: Router) {
    // ... existing loginForm ...
    this.registerForm = this.fb.group({
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]],
    });
  }
  
  closeModal() {
    this.close.emit();
  }
  get f() {
    return this.registerForm.controls;
  }

  onSubmit() {
    this.registerError = '';
    this.registerSubmitted = true;
    if (this.registerForm.invalid) {
      return;
    }
    const url = 'https://localhost:59579/api/customers/signup/';
    const body = {
      email: this.registerForm.get('email')?.value,
      password: this.registerForm.get('password')?.value,
      username: this.registerForm.get('username')?.value
    };
    console.log(body);
    this.https.post(url, body).subscribe({
      next: (response: any) => {
        // Registration successful, handle as needed
        this.closePopup();
        alert('Registration successful! Please log in.');
        this.openLoginPopup();
      },
      error: error => {
        this.registerError = error.error?.message || 'Registration failed.';
      }
    });
  }
openLoginPopup() {
  this.switchToLogin.emit();
}

openRegisterPopup() {
  this.showRegisterPopup = true;
  this.showLoginPopup = false;
}

closePopup() {
  this.showLoginPopup = false;
  this.showRegisterPopup = false;
}
}
