import nodemailer from "nodemailer"
import dotenv from "dotenv"
dotenv.config();


const transport = nodemailer.createTransport({
    service : 'gmail',
    auth : {
        user : process.env.EMAIL,
        pass : process.env.EMAIL_PASS
    }
});


export const sendMail = (data)=>{
 

const MailTemplate = `
  <div style="max-width: 500px; margin: auto; padding: 30px; background: #ffffff; border-radius: 15px; text-align: center; font-family: Arial, sans-serif; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
    <div style="margin-bottom: 20px;">
      <img src="https://cdn-icons-png.flaticon.com/512/190/190411.png" alt="Success Icon" style="width: 80px;">
    </div>
    <h2 style="color: #333333; margin-bottom: 10px;">Account Created Successfully!</h2>
    <h4>Hurray</h4>
    <p style="color: #666666; font-size: 14px; margin-bottom: 25px;">
      ${data.Subject}
    </p>
    
    

    <p style="color: #999; font-size: 12px; margin-top: 30px;">
      Let's Exlore the app and make it useful for yourself
    </p>
  </div>
`


const mainOptions = {
    from : "grachit736@gmail.com",
    to : data.user,
    subject : data.Subject,
    html: MailTemplate

};

return new Promise((resolve,reject)=>{
    transport.sendMail(mainOptions,(error,info)=>{
if(error){
    console.log(error,"otperror");
    
    reject(error);
}
else{
    console.log(info);
    
    resolve({info});
}
});
})

}