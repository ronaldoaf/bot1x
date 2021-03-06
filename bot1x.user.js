// ==UserScript==
// @name         Bo1tx
// @namespace    http://tampermonkey.net/
// @version      0.4.1
// @description  try to take over the world!
// @author       You
// @require      https://cdn.jsdelivr.net/gh/ronaldoaf/bot1x@d90bffb0805ed7fff098944bd003cb322d0e3493/auxiliar.min.js?
// @match        https://1xbet.mobi/*
// @grant        none
// ==/UserScript==

const CONFIG={
    min: 0.015,
    max: 0.15,
    kelly:0.75
};

const TYPE_OVER=9;
const TYPE_UNDER=10;
const ERROR_CODE_MAXIMUM_STAKE=109;

const _1ds=100;
const _1s=1000;
const _1m=60*_1s;
const _1h=60*_1m;

const CORTE_REL=66;

const REDUTOR=0.7;

const ERROS_ATE_PERDIR_CREDENCIAIS=7;

//Retorna a similaridade entre os jogos 1xbet e totalcorner baseado no home e away
function rel_1x_tc(j1x,jtc){
    var a=removeDiacritics((j1x.home+'+'+j1x.away).toLocaleLowerCase());
    var b=removeDiacritics((jtc.home+'+'+jtc.away).toLocaleLowerCase()).split('reserves').join('ii');
    return (similar_text(a,b)*200/(a.length+b.length));
}

//Recarrega a pagina a cada 15 minutos
setInterval(function(){  location.reload(); }, 15*_1m);

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
    doLogin:function(cont=0){
        $('#idOrMail').val(localStorage._1xbet_user);
        $('#uPassword').val(localStorage._1xbet_pass);
        $('#userConButton').click();
        //Se ocorrer erro de login repete até logar
        var loop=setInterval(function(){
            if( $('button.swal2-confirm').length>0 ){
                $('button.swal2-confirm').click();
                clearInterval(loop);
                setTimeout(function(){ bot.login.doLogin(cont+1); }, _1s);
            }
        },_1ds);
        //Se der erros demais para e mostra uma tela pedindos as credenciais da 1xbet
        if(cont>=ERROS_ATE_PERDIR_CREDENCIAIS) bot.login.telaCredenciais();
    },
    telaCredenciais:function(){
        $('body').html('<center><br><div style="font-size:3vw;color:white; border:1px solid;"><br>Digite o seu usuário da 1xbet<br><input id="usuario" /><br><br>Digite a sua senha da 1xbet<br><input id="senha" /><br><br><button  id="salvar_senha"" style="background-color: lightgray;font-size:3vw;border:1px solid; id="salvar_senha">Salvar</button><br><br></div></center>');
        $('#salvar_senha').click(function(){
            localStorage._1xbet_pass=$('#senha').val();
            localStorage._1xbet_user=$('#usuario').val();
            location.reload();
        });
    }
};


bot.placeBet=function(gameid, type, stake){
    var sel_obj=$('[data-gameid='+gameid+'][data-type='+type+']');
    var param=sel_obj.attr('data-param');
    var odds=sel_obj.attr('data-coef');
    $.post('/datalinelive/putbetscommon','UserId='+user_balance.getUserId()+'&Events[0][GameId]='+gameid+'&Events[0][Type]='+type+'&Events[0][Coef]='+odds+'&Events[0][Param]='+param+'&Events[0][PlayerId]=0&Events[0][Kind]=1&Events[0][Expired]=0&Events[0][Price]=0&Events[0][InstrumentId]=0&Events[0][Seconds]=0&partner=1&CfView=0&Summ='+stake+'&Lng=en&Vid=0&hash='+Core.cookie.get('uhash', 0)+'&Source=110&CheckCf=0&Live=true&notWait=true', function(data){
        console.log(data);
        if(data.Success){
            var e=data.Value.Coupon.Events[0];
            bot.mybets.addBet({
                id:data.Value.Id,
                timestamp: +new Date(),
                gameid:e.GameId,
                type:e.Type,
                param:e.Param,
                stake: data.Value.Coupon.Summ,
                odds: data.Value.Coupon.Coef
            });
        }
        else{
            //Se der error ter atingido o stake máximo tenta de novo com o stake máximo
            if(  data.ErrorCode==ERROR_CODE_MAXIMUM_STAKE){
                var maximum_stake=Number(data.Error.split('The maximum stake is')[1] );
                bot.placeBet(gameid, type, maximum_stake);
            }            
        }
    });
};
bot.getBalance=function(){
    return user_balance.allAccounts[0].money+user_balance.allAccounts[0].summ_unplaced_bets*REDUTOR;
};

bot.jaFoiApostado=function(gameid, type){
      return (bot.mybets.getBets(gameid, type).length>0);
};

bot.relacionaJogos=function(jogos_1x,jogos_tc){
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
    return jogos_1x;
};

bot.stakeUnder=function(pl_u,mod0,oddsU){
    var percent=pl_u/(oddsU-1)*(mod0==1 ? 1.3 : 1)*CONFIG.kelly;
    return Math.round(bot.getBalance()*(percent>CONFIG.max ? CONFIG.max : percent  ));
}


//Recebe um array de jogos_1x que possui o jogo_tc relaciona e baseado  na regressão faz as apostas
bot.fazApostas=function(jogos_1x){
    $(jogos_1x).each(function(){
        if (this.jogo_tc===null) return;
        var s_g=this.jogo_tc.gh+this.jogo_tc.ga;
        var s_c=this.jogo_tc.ch+this.jogo_tc.ca;
        var s_s=this.jogo_tc.sh+this.jogo_tc.sa;
        var s_da=this.jogo_tc.dah+this.jogo_tc.daa;
        var s_r=this.jogo_tc.rh+this.jogo_tc.ra;
        var d_g=Math.abs(this.jogo_tc.gh-this.jogo_tc.ga);
        var d_c=Math.abs(this.jogo_tc.ch-this.jogo_tc.ca);
        var d_s=Math.abs(this.jogo_tc.sh-this.jogo_tc.sa);
        var d_da=Math.abs(this.jogo_tc.dah-this.jogo_tc.daa);
        var oddsU=this.under;
        var oddsO=this.over;
        var goal=this.goal;
        var goal_diff=goal-s_g;
        var probU=1/this.under/(1/this.over+1/this.under);
        var probU_diff=Math.abs(probU-0.5);
        var mod0=Number(this.goal % 1===0);
        
        pl_u=(-0.0222 * s_g +     -0.0049 * s_c +     -0.0002 * s_da +     -0.0063 * s_s +     -0.0217 * d_g +     -0.0028 * d_s +      0.0166 * goal +      0.0557 * goal_diff +      0.0755 * oddsU +     -0.4233 * probU_diff +      0.0185 * mod0 +     -0.14)>0 ?  -0.139  * s_g +     -0.0064 * s_c +     -0.0006 * s_da +     -0.0056 * s_s +     -0.0398 * d_g +     -0.0044 * d_s +      0.1356 * goal +     -0.0302 * goal_diff +      0.1305 * oddsU +     -0.8786 * probU_diff +     -0.2414 : -1;  

        if(pl_u>=CONFIG.min && !bot.jaFoiApostado(this.gameid, TYPE_UNDER) )  bot.placeBet(this.gameid, TYPE_UNDER, bot.stakeUnder(pl_u,mod0,oddsU) );
       
    });
};
//Carrega stats do totalcorner e da própria 1xbet, faz o relacionamento e aposta se atender os critérios
bot.loadStats=function(){
     $.getScript('http://bot-ao.com/stats7_new.js',function(){
         $.get('https://1xbet.mobi/LiveFeed/Get1x2_VZip?sports=1&count=1000&lng=en&mode=4&country=1&getEmpty=true&mobi=true',function(data){
                var jogos_1x=[];
                var jogos_tc=[];
                //Lê os jogos carregados no ajax
                $(data.Value).each(function(){
                   //Se estiver no  Half Time, coloca no array jogo_1x
                   if(this.SC.TR==-1 && this.SC.TS==2700) {
                       var jogo={
                           gameid:this.I,
                           home:this.O1,
                           away:this.O2,
                           goal: null,
                           over: null,
                           under: null
                       };
                       $(this.E).each(function(){
                          if(this.T==TYPE_OVER)  jogo.goal=this.P;
                          if(this.T==TYPE_OVER ) jogo.over=this.C;
                          if(this.T==TYPE_UNDER) jogo.under=this.C;
                       });
                       jogos_1x.push(jogo);
                   }
                });

                //Lê as stats carregada do totalcorner, salvas no localStorage, se o jogo estiver no  Half Time, coloca no array jogo_tc
                $(JSON.parse(localStorage.stats)).each(function(){
                    if(this.time=='half') jogos_tc.push(this);
                });

                //Em cada jogo em jogos_1x vai adicionar um propriedade chamada jogo_tc, onde estará objeto do jogo correspondente no totalcorner
                jogos_1x=bot.relacionaJogos(jogos_1x,jogos_tc);

                //Onde toda mágica acontece, a partir da lista de jogos, apartir da regressão faz apostas
               bot.fazApostas(jogos_1x);
         });
     });
};

bot.loop=function(){
    //Não estiver na url correta direciona;
    if (location.href!='https://1xbet.mobi/en/live/Football/') location.href='https://1xbet.mobi/en/live/Football/';

    if( bot.login.checkLogin() ) bot.login.doLogin();

    bot.loadStats();
};


bot.init();

setInterval(bot.loop,5* _1s);
