import { Page } from "@playwright/test";
 
export class LoginPage{
      readonly page : Page;
      readonly username_textbox : any | string
      readonly password_textbox : any  | string
      readonly login_button :  any | undefined
 
    constructor(page : Page){
        this.page = page
        this.username_textbox = page.getByRole('textbox', { name: 'Username' });
        this.password_textbox = page.getByRole('textbox', { name: 'Password' });
        this.login_button = page.getByRole('button', { name: ' Login' });
       
    }
 
    async gotoLoginPage(){
      await this.page.goto('https://the-internet.herokuapp.com/login');
    }
 
    async login(Username : any){
       await this.username_textbox.fill(Username)
    }
     async password(Password : any){
       await this.password_textbox.fill(Password)
    }
     async loginbutton(){
       await this.login_button.click()
    }

}