import { Component, EventEmitter, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormBuilder, FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { NgModule } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  
  @Output() close = new EventEmitter<void>();
  @Output() loginSuccess = new EventEmitter<any>();
  loginForm: FormGroup;
  submittedLogin = false;
  showRegisterPopup = false;
  showLoginPopup: boolean=false;
  emailNotFoundMessage: string = '';
  constructor(private fb: FormBuilder,private http: HttpClient ,private router: Router) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      pass: ['']
      //password: ['', [
       // Validators.required,
       // Validators.minLength(8),
       // Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
     // ]]
    });
  }
 
closeModal() {
    this.close.emit();
  }
  get f() {
    return this.loginForm.controls;
  }
openLoginPopup() {
  this.showLoginPopup = true;
  this.showRegisterPopup = false;
}

openRegisterPopup() {
  this.showRegisterPopup = true;
  this.showLoginPopup = false;
}

openLoginFromRegister() {
  this.showRegisterPopup = false;
  this.showLoginPopup = false;
}

closePopup() {
  this.showLoginPopup = false;
  this.showRegisterPopup = false;
}
  onSubmit() {
    this.emailNotFoundMessage = ''; // Reset message on each submit
    const url = `https://localhost:59579/api/customers/by-email/${this.loginForm.get('username')?.value}`;
    this.http.get(url).subscribe({
      next: (response: any) => {
        if (response && response.pass === this.loginForm.get('pass')?.value) {
          // Store the full user object as 'customer'
          localStorage.setItem('customer', JSON.stringify(response));

          this.closeModal();
          console.log('Login successful');
          this.loginSuccess.emit(response); // Emit the login success event with the response data
        } else {
          console.warn("Password mismatch or invalid response");
        }
      },
      error: error => {
        if (error.status === 404) {
          this.emailNotFoundMessage = `This email (${this.loginForm.get('username')?.value}) doesn't exist.`;
        } else {
          console.error('Login failed:', error);
        }
      }
    });
  }

  }