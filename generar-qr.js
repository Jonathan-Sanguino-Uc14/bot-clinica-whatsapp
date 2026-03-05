const QRCode = require("qrcode");

const qrData = '2@DSVHm2@xXev33A9WSi7IE3wW1NFgSep2uDBBXC7Ozy1NxSNH1aAluP6qVBsjOG9Fvu/veq6kD36GHF+C/XifEV/pLfpaCwAklcZD6OnyJs=,zGJ28m5rzR/kxJvJtzDjcTfSv1Y4UTrSe+xzw9FXuj8=,oG2CwZxTlJf4FO1L1RtEyQ7QnxQUo90VpljcrSTJOXQ=,nsfo1tJhhrGA25xjJLOwbkt9KzURWwWgkXueDP/k4fg=sI8vLXzZ7pLPvLUzPmVJo70SOdJtGDUKDOohcLNZytVtcqRllIYCx3OMSmSVlNtptsQSiITtVnkITJeWX++JCF0t/1sKc/g=,vE3VnMYH/Db/QUhvNwUJvsUrwGD19C9vnuuOhHI/GgM=,Ku70AlTpZPsOtsAsNmEi3ygCvGDuJa0fx9PXn0QQZkE=,pHAcXKIj1U2vjXha9MXSPv0QMXIA8cOAE7o0JHCmgy2@xW4tx/VHwGH2+ytfc0GY008d8J+qtG2WsR5TNCBmwesr4k3Ygh3I2f2+7egCk4p7cWeX3iml3L/6wvgv7S7LDxMxLli2Sy/g3bk=,8wzAa5aP1NApJy7xve+Es4EhSL74EppQtPN4Ntzkohg=,zocVdeufBDaJ8El/in/qY+fPUHhcN4KxAgwuOyDO0VQ=,n5HAEr3tjxdBVypqkj7quJmQVcb/9Ia3SQFN/GXyLUY=w='
QRCode.toFile("qr.png", qrData, (err) => {
  if (err) console.error(err);
  else console.log("✅ QR guardado como qr.png");
});