// ==UserScript==
// @name         Bo1tx
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @require      https://cdn.jsdelivr.net/gh/ronaldoaf/bot1x@d90bffb0805ed7fff098944bd003cb322d0e3493/auxiliar.min.js?
// @require      https://cdn.jsdelivr.net/gh/farzher/fuzzysort@master/fuzzysort.js
// @match        https://1xbet.mobi/*
// @grant        none
// ==/UserScript==

const TYPE_OVER=9;
const TYPE_UNDER=10;

const _1ds=100;
const _1s=1000;
const _1m=60*_1s;
const _1h=60*_1m;

const CORTE_REL=66;

function rel_1x_tc(j1x,jtc){
    //console.log( [removeDiacritics((j1x.home+'_'+j1x.away).toLocaleLowerCase()), removeDiacritics((jtc.home+'_'+jtc.away).toLocaleLowerCase())] );
     //var f=fuzzysort.single( removeDiacritics((j1x.home+'+'+j1x.away).toLocaleLowerCase()), removeDiacritics((jtc.home+'+'+jtc.away).toLocaleLowerCase()) );
    //console.log([removeDiacritics((j1x.home+'_'+j1x.away).toLocaleLowerCase()), removeDiacritics((jtc.home+'_'+jtc.away).toLocaleLowerCase())]);
    var a=removeDiacritics((j1x.home+'+'+j1x.away).toLocaleLowerCase());
    var b=removeDiacritics((jtc.home+'+'+jtc.away).toLocaleLowerCase());
    return (similar_text(a,b)*200/(a.length+b.length));
}


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
                var jogos_1x=[];
                var jogos_tc=[];
                $(data.Value).each(function(){
                   if(this.SC.TR==-1 && this.SC.TS==2700) {
                       //console.log(this);
                       var jogo={
                           gameid:this.I,
                           home:this.O1,
                           away:this.O2,
                           goal: null,
                           over: null,
                           under: null
                       };
                       $(this.E).each(function(){
                          if(this.T==9)  jogo.goal=this.P;
                          if(this.T==9 ) jogo.over=this.C;
                          if(this.T==10) jogo.under=this.C;
                       });
                       //console.log(jogo);
                       jogos_1x.push(jogo);
                   }
                });
                $(JSON.parse(localStorage.stats)).each(function(){
                    if(this.time=='half') jogos_tc.push(this);
               });
               $(jogos_1x).each(function(i,j1x){
                   var percent_atual=CORTE_REL;
                   var jogo_atual=null;
                   $(jogos_tc).each(function(j,jtc){
                      var percent=rel_1x_tc(j1x,jtc);
                      if(percent>percent_atual){
                          jogo_atual=jtc;
                          percent_atual=percent;
                      }
                   });
                   jogos_1x[i].jogo_tc=jogo_atual;
               });
               console.log(jogos_1x);
               console.log(jogos_tc);
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

console.log( similar_text("calavera u19_26 de febrero u19", "calavera cf u19_cd 26 de febrero u19") );
console.log( removeDiacritics('não são') );
