  function fbBarHtml(){
    const id=++fbSeq;
    fbCtx[id]={user:String(lastUserText).slice(0,1000),assistant:String(lastAssistantText).slice(0,1500)};
    return '<div class="fbbar" id="fb'+id+'">'+
      '<span class="fbq">Esta resposta ajudou?</span>'+
      '<button class="fbbtn" onclick="sendFb('+id+',\'up\',this)">👍</button>'+
      '<button class="fbbtn" onclick="sendFb('+id+',\'down\',this)">👎</button>'+
      '</div>';
  }
  async function sendFb(id,rating){
    const bar=document.getElementById('fb'+id);
    if(!bar||bar.dataset.done)return;
    let comment='';
    if(rating==='down'){ comment=(prompt('O que poderia ser melhor nesta resposta? (opcional)')||'').slice(0,500); }
    bar.dataset.done='1';
    bar.innerHTML='<span class="fbq">'+(rating==='up'?'✓ Obrigado pelo feedback!':'✓ Feedback registrado — vamos melhorar.')+'</span>';
    try{
      await fetch(BASE,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        jobId:'fb_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6),
        userEmail:(document.getElementById('emailInp')?.value??'').trim(),
        feedback:{
          rating,
          comment,
          user_message:fbCtx[id]?.user??'',
          assistant_message:fbCtx[id]?.assistant??'',
          url_analisada:analysisContext?.url_analisada??null,
          topico:analysisContext?.topico??null
        }
      })});
    }catch(e){}
  }

