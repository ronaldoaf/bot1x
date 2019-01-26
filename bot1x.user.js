// ==UserScript==
// @name         Bo1tx
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://1xbet.mobi/*
// @grant        none
// ==/UserScript==

function similar_text(r,t){if(percent=100,null===r||null===t||void 0===r||void 0===t)return 0;var e,s,i,n,l=0,u=0,a=0,o=(r+="").length,c=(t+="").length;for(e=0;e<o;e++)for(s=0;s<c;s++){for(i=0;e+i<o&&s+i<c&&r.charAt(e+i)===t.charAt(s+i);i++);i>a&&(a=i,l=e,u=s)}return(n=a)&&(l&&u&&(n+=similar_text(r.substr(0,l),t.substr(0,u))),l+a<o&&u+a<c&&(n+=similar_text(r.substr(l+a,o-l-a),t.substr(u+a,c-u-a)))),percent?200*n/(o+c):n};
const TYPE_OVER=9;
const TYPE_UNDER=10;

const _1ds=100;
const _1s=1000;
const _1m=60*_1s;
const _1h=60*_1m;

window.bot={
   init:function(){
       localStorage.bot_mybets_list=localStorage.bot_mybets_list||'[]';
       bot.mybets.clearBets();
   }
};

bot.mybets={
     listBets: function(){
         return JSON.parse(localStorage.bot_mybets_list);
     },
     addBet: function(bet){
          var mybets_list=bot.mybets.listBets();
          mybets_list.push(bet);
          localStorage.bot_mybets_list=JSON.stringify(mybets_list);
     },
    getBets: function(gameid,type){
        var bets=[];
        $(bot.mybets.listBets()).each(function(){
            if(this.gameid==gameid && this.type==type) bets.push(this);
        });
        return bets;
    },
    clearBets: function(){
        var bets=[];
        $(bot.mybets.listBets()).each(function(){
            if ((+new Date())-this.timestamp<2 *_1h ) bets.push(this);
        });
        localStorage.bot_mybets_list=JSON.stringify(bets);
    }
};


bot.login={
     checkLogin:function(){
         return !user_balance.getUserId();
     },
    doLogin:function(){
        $('#idOrMail').val(localStorage._1xbet_user);
        $('#uPassword').val(localStorage._1xbet_pass);
        $('#userConButton').click();
        //Se ocorrer erro de login repete até logar
        var loop=setInterval(function(){
            if( $('button.swal2-confirm').length>0 ){
                $('button.swal2-confirm').click();
                clearInterval(loop);
                setTimeout(bot.login.doLogin, _1s);
            }
        },_1ds);
    }
};


bot.placeBet=function(gameid, type, stake){
    var sel_obj=$('[data-gameid='+gameid+'][data-type='+type+']');
    var param=sel_obj.attr('data-param');
    var odds=sel_obj.attr('data-coef');
    $.post('/datalinelive/putbetscommon','UserId='+user_balance.getUserId()+'&Events[0][GameId]='+gameid+'&Events[0][Type]='+type+'&Events[0][Coef]='+odds+'&Events[0][Param]='+param+'&Events[0][PlayerId]=0&Events[0][Kind]=1&Events[0][Expired]=0&Events[0][Price]=0&Events[0][InstrumentId]=0&Events[0][Seconds]=0&partner=1&CfView=0&Summ='+stake+'&Lng=en&Vid=0&hash=33d976294881233c1d6704e825a4b181&Source=110&CheckCf=0&Live=true&notWait=true', function(data){
        console.log(data);
        if(data.Success){
            var e=data.Value.Coupon.Events[0];
            bot.mybets.addBet({
                id:data.Value.Id,
                timestamp: Number(data.Value.Dt.replace('/Date(','').replace(')/','')),    //Dt vem no formato  "/Date(1548510333975)/"
                gameid:e.GameId,
                type:e.Type,
                param:e.Param,
                stake: data.Value.Coupon.Summ,
                odds: data.Value.Coupon.Coef
            });
        }
    });
};

bot.jaFoiApostado=function(gameid, type){
      return (bot.mybets.getBets(gameid, type).length>0);
};
bot.loadStats=function(){
     $.getScript('https://bot-ao.com/stats_new.js',function(){
         $.get('https://1xbet.mobi/LiveFeed/Get1x2_VZip?sports=1&count=1000&lng=en&mode=4&country=1&getEmpty=true&mobi=true',function(data){
               console.log(data);
         });
          var stats=JSON.parse(localStorage.stats);
         $(stats).each(function(){
              if(this.time=='half')  console.log(this);
         });
     });
};

bot.loop=function(){
    //Não estiver na url correta direciona;
    if (location.href!='https://1xbet.mobi/live/Football/') location.href='https://1xbet.mobi/live/Football/';

    if( bot.login.checkLogin() ) bot.login.doLogin();
};


bot.init();

setInterval(bot.loop, _1s);

