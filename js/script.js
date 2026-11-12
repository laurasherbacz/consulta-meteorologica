const formulario = document.querySelector('.formulario');
const campoNome = formulario.querySelector('input[type="search"]');
const botao = formulario.querySelector('.principal');
const mensagem = document.querySelector('.mensagem');
const resultados = document.querySelector('.resultados');

formulario.addEventListener('submit', function (evento) {
  evento.preventDefault();

  const termo = campoNome.value.trim();
  if (termo === '') {
    mensagem.textContent = 'Digite o nome de uma cidade para pesquisar.';
    return;
  }

  botao.disabled = true;
  mensagem.textContent = 'Buscando localidades...';

  const parametros = new URLSearchParams({
    name: termo,
    count: '10',
    language: 'pt',
    format: 'json'
  });

  fetch(`https://geocoding-api.open-meteo.com/v1/search?${parametros}`)
    .then(function (resposta) {
      if (!resposta.ok) {
        throw new Error(`Erro HTTP: ${resposta.status}`);
      }

      return resposta.json();
    })
    .then(function (dados) {
      resultados.replaceChildren();

      if (!dados.results || dados.results.length === 0) {
        mensagem.textContent = 'Nenhuma localidade encontrada.';
        return;
      }

      dados.results.slice(0, 5).forEach(function (localidade) {
        const botaoLocalidade = document.createElement('button');
        const identificacao = document.createElement('span');
        const detalhes = document.createElement('span');
        const nomeLocalidade = document.createElement('strong');
        const regiao = document.createElement('small');
        const seta = document.createElement('span');

        botaoLocalidade.type = 'button';
        botaoLocalidade.className = 'localidade';
        identificacao.className = 'pin';
        identificacao.setAttribute('aria-hidden', 'true');
        identificacao.textContent = '⌖';
        nomeLocalidade.textContent = localidade.name;
        regiao.textContent = `${localidade.admin1 || ''}${localidade.admin1 ? ', ' : ''}${localidade.country || ''}`;
        detalhes.append(nomeLocalidade, regiao);
        seta.className = 'seta';
        seta.setAttribute('aria-hidden', 'true');
        seta.textContent = '›';
        botaoLocalidade.append(identificacao, detalhes, seta);
        botaoLocalidade.addEventListener('click', function () {
          carregarClima(localidade, botaoLocalidade);
        });
        resultados.appendChild(botaoLocalidade);
      });

      mensagem.textContent = `${dados.results.length} localidade(s) encontrada(s).`;
    })
    .catch(function () {
      mensagem.textContent = 'Não foi possível buscar localidades. Tente novamente.';
    })
    .finally(function () {
      botao.disabled = false;
    });
});

const tituloCidade = document.querySelector('#cidade');
const regiaoCidade = tituloCidade.parentElement.querySelector('p');
const temperaturaAtual = document.querySelector('.temperatura strong');
const descricaoAtual = document.querySelector('.temperatura p');
const sensacaoTermica = document.querySelectorAll('.indicador strong')[0];
const ventoAtual = document.querySelectorAll('.indicador strong')[1];
const umidadeAtual = document.querySelectorAll('.indicador strong')[2];
const cartoesPrevisao = document.querySelectorAll('.previsao .dia');

const iconesClima = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌦️',
  53: '🌦️',
  55: '🌧️',
  56: '🌧️',
  57: '🌧️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  80: '🌦️',
  81: '🌧️',
  82: '🌧️',
  95: '⛈️',
  96: '⛈️',
  99: '⛈️'
};

const CHAVE_CIDADE_ATUAL = 'cidade-atual';
let cidadeAtual = null;
let favoritos = JSON.parse(localStorage.getItem('cidades-favoritas') || '[]'); 

function carregarClima(localidade, botaoSelecionado) {
  mensagem.textContent = `Buscando previsão para ${localidade.name}...`;

  const parametros = new URLSearchParams({
    latitude: localidade.latitude,
    longitude: localidade.longitude,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    forecast_days: '5',
    timezone: 'auto'
  });

  fetch(`https://api.open-meteo.com/v1/forecast?${parametros}`)
    .then(function (resposta) {
      if (!resposta.ok) {
        throw new Error(`Erro HTTP: ${resposta.status}`);
      }

      return resposta.json();
    })
    .then(function (dados) {
      const atual = dados.current;
      const unidades = dados.current_units;

      cidadeAtual = localidade; 
      localStorage.setItem(CHAVE_CIDADE_ATUAL, JSON.stringify(localidade));
      atualizarBotaoFavorito(); 

      tituloCidade.textContent = localidade.name;
      regiaoCidade.textContent = `${localidade.admin1 || ''}${localidade.admin1 ? ', ' : ''}${localidade.country || ''}`;
      temperaturaAtual.textContent = `${Math.round(atual.temperature_2m)}°C`;
      descricaoAtual.textContent = descricoesClima[atual.weather_code] || 'Condição não disponível';
      sensacaoTermica.textContent = `${Math.round(atual.apparent_temperature)}${unidades.apparent_temperature}`;
      ventoAtual.textContent = `${Math.round(atual.wind_speed_10m)} ${unidades.wind_speed_10m}`;
      umidadeAtual.textContent = `${atual.relative_humidity_2m}${unidades.relative_humidity_2m}`;
      atualizarPrevisao(dados.daily);
      mensagem.textContent = `Previsão atualizada para ${localidade.name}.`;

      document.querySelectorAll('.localidade').forEach(function (item) {
        item.classList.toggle('selecionada', item === botaoSelecionado);
      });
    })
    .catch(function (erro) {
      mensagem.textContent = 'Não foi possível buscar a previsão desta cidade.';
      console.error(erro);
    });
}

function atualizarPrevisao(previsao) {
  const formatadorData = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short'
  });

  cartoesPrevisao.forEach(function (cartao, indice) {
    if (!previsao.time[indice]) {
      return;
    }

    const data = new Date(`${previsao.time[indice]}T12:00:00`);
    const titulo = cartao.querySelector('h4');
    const icone = cartao.querySelector('.icone-dia');
    const descricao = cartao.querySelector('p');
    const maxima = cartao.querySelector('.maxima');
    const minima = cartao.querySelector('.minima');
    const chuva = cartao.querySelector('small');

    titulo.textContent = indice === 0 ? 'Hoje' : formatadorData.format(data);
    icone.textContent = iconesClima[previsao.weather_code[indice]] || '🌤️';
    descricao.textContent = descricoesClima[previsao.weather_code[indice]] || 'Condição não disponível';
    maxima.textContent = `Máx. ${Math.round(previsao.temperature_2m_max[indice])}°`;
    minima.textContent = `Mín. ${Math.round(previsao.temperature_2m_min[indice])}°`;
    chuva.textContent = `💧 ${previsao.precipitation_probability_max[indice] || 0}%`;
  });
}

document.querySelectorAll('.localidade').forEach(function (botaoLocalidade) {
  botaoLocalidade.addEventListener('click', function () {
    const nome = botaoLocalidade.querySelector('strong').textContent;
    const parametros = new URLSearchParams({
      name: nome,
      count: '1',
      language: 'pt',
      format: 'json'
    });

    fetch(`https://geocoding-api.open-meteo.com/v1/search?${parametros}`)
      .then(function (resposta) {
        if (!resposta.ok) {
          throw new Error(`Erro HTTP: ${resposta.status}`);
        }
        return resposta.json();
      })
      .then(function (dados) {
        if (!dados.results || dados.results.length === 0) {
          throw new Error('Localidade não encontrada');
        }
        carregarClima(dados.results[0], botaoLocalidade);
      })
      .catch(function (erro) {
        mensagem.textContent = 'Não foi possível encontrar esta cidade.';
        console.error(erro);
      });
  });
});

const formularioCoordenadas = document.querySelector('.formulario-coordenadas');
const latitude = document.querySelector('.latitude');
const longitude = document.querySelector('.longitude');
const buscar = document.querySelector('.buscar-coordenadas');
const mensagemCoordenadas = document.querySelector('.mensagem-coordenadas');
const resultado = document.querySelector('.resultado-coordenadas');

const descricoesClima = {
			0: 'Céu limpo',
			1: 'Predominantemente limpo',
			2: 'Parcialmente nublado',
			3: 'Nublado',
			45: 'Nevoeiro',
			48: 'Nevoeiro com geada',
			51: 'Garoa leve',
			53: 'Garoa moderada',
			55: 'Garoa intensa',
			56: 'Garoa congelante leve',
			57: 'Garoa congelante intensa',
			61: 'Chuva fraca',
			63: 'Chuva moderada',
			65: 'Chuva forte',
			66: 'Chuva congelante leve',
			67: 'Chuva congelante forte',
			71: 'Neve fraca',
			73: 'Neve moderada',
			75: 'Neve forte',
			77: 'Grãos de neve',
			80: 'Pancadas de chuva fracas',
			81: 'Pancadas de chuva moderadas',
			82: 'Pancadas de chuva violentas',
			85: 'Pancadas de neve fracas',
			86: 'Pancadas de neve fortes',
			95: 'Tempestade',
			96: 'Tempestade com granizo leve',
			99: 'Tempestade com granizo forte'
		};

        if (formularioCoordenadas) {
          formularioCoordenadas.addEventListener('submit', function(evento){
            evento.preventDefault(); 

            const lat = parseFloat(latitude.value);
            const lon = parseFloat(longitude.value);

            if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
				alert('Informe uma latitude (-90 a 90) e uma longitude (-180 a 180) válidas.');
				return;
			}

            resultado.textContent = ''; 
            mensagemCoordenadas.textContent = 'Buscando dados do clima...'; 

            buscar.disabled = true;

           const parametros = new URLSearchParams({
             
            latitude: lat, 
            longitude: lon, 

            current: 'temperature_2m,relative_humidity_2m,weather_code',
			timezone: 'auto'
           }); 

           fetch(`https://api.open-meteo.com/v1/forecast?${parametros}`)
           .then(function(resposta){

            if(!resposta.ok){
                throw new Error(`Erro HTTP: ${resposta.status}`);
            }

            return resposta.json(); 
           })
           .then(function(dados){
            console.log(dados); 

            const atual = dados.current; 
            const unidades = dados.current_units; 

            mensagemCoordenadas.textContent = `Dados de ${atual.time} (${dados.timezone})`;

            const itens = [
                `Temperatura: ${atual.temperature_2m} ${unidades.temperature_2m}`,
				`Umidade relativa: ${atual.relative_humidity_2m} ${unidades.relative_humidity_2m}`,
				`Código do clima (WMO): ${atual.weather_code}`,
				`Clima: ${descricoesClima[atual.weather_code] || 'Descrição não disponível'}`
            ]; 

            itens.forEach(function(texto){
                const item = document.createElement('li'); 

                item.textContent = texto; 

                resultado.appendChild(item); 
            }); 
           })

           .catch(function(erro) {
					mensagemCoordenadas.textContent = 'Não foi possível buscar os dados.';
					console.error(erro);
				})
				// Executa sempre, com sucesso ou erro: reabilita o botão
            .finally(function() {
              buscar.disabled = false;
            });
          });
        }

// Fazer funcionar a parte dos favoritos 


const botaoFavorito = document.querySelector('.favorito'); 
const listaFavoritos = document.querySelector('.lista-favoritos');
const quantidadeFavoritos = document.querySelector('#quantidade-favoritos');

function atualizarBotaoFavorito(){

  if(cidadeAtual === null){
    return; 
  }

  const jaExiste = favoritos.some(function(cidade){
    return cidade.latitude === cidadeAtual.latitude
     && cidade.longitude === cidadeAtual.longitude; 
}); 

if(jaExiste){
  botaoFavorito.textContent = '★ Remover dos favoritos';
}else{
  botaoFavorito.textContent = '☆ Adicionar aos favoritos';
}
}

botaoFavorito.addEventListener('click', function(){
  if(cidadeAtual === null){
    return; 
  }

  const jaExiste = favoritos.some(function(cidade){
    return cidade.latitude  === cidadeAtual.latitude && 
    cidade.longitude === cidadeAtual.longitude; 
  }); 

  if(jaExiste){
    favoritos = favoritos.filter(function(cidade){
      return cidade.latitude  !== cidadeAtual.latitude ||
      cidade.longitude !== cidadeAtual.longitude; 
    }); 

  }else{
    favoritos.push(cidadeAtual); 
  }

  localStorage.setItem('cidades-favoritas', JSON.stringify(favoritos));

  mostrarFavoritos(); 
  atualizarBotaoFavorito(); 
}); 

function mostrarFavoritos(){

  listaFavoritos.replaceChildren();

  quantidadeFavoritos.textContent = favoritos.length + ' ' +
  (favoritos.length === 1 ? 'cidade salva' : 'cidades salvas'); 

  favoritos.forEach(function(cidade){
    const item = document.createElement('li'); 
    const botaoCidade = document.createElement('button'); 
    const botaoRemover = document.createElement('button'); 

    botaoCidade.type = 'button'; 
    botaoCidade.className = 'cidade-favorita'; 
    const detalhesCidade = document.createElement('span');
    const nomeCidade = document.createElement('strong');
    const regiaoCidade = document.createElement('small');

    nomeCidade.textContent = cidade.name;
    regiaoCidade.textContent = [cidade.admin1, cidade.country]
      .filter(Boolean)
      .join(', ') || 'Localização não informada';
    detalhesCidade.append(nomeCidade, regiaoCidade);
    botaoCidade.append(detalhesCidade);

    botaoRemover.type = 'button'; 
    botaoRemover.className = 'remover-favorito';
    botaoRemover.setAttribute('aria-label', `Remover ${cidade.name} dos favoritos`);
    botaoRemover.title = 'Remover dos favoritos';
    botaoRemover.textContent = '🗑️';

    botaoCidade.addEventListener('click', function(){
      carregarClima(cidade, null);
    });

    botaoRemover.addEventListener('click', function(){
       const confirmar = window.confirm(`Deseja realmente remover ${cidade.name} dos favoritos?`);

       if(confirmar){

      favoritos = favoritos.filter(function(item){
        return item.latitude !== cidade.latitude || 
        item.longitude !== cidade.longitude; 
      }); 

     localStorage.setItem('cidades-favoritas', JSON.stringify(favoritos));
      mostrarFavoritos(); 

      function obterCidadeAtual() {
        const cidadeSalva = localStorage.getItem(CHAVE_CIDADE_ATUAL);

        if (!cidadeSalva) {
          return null;
        }

        try {
          return JSON.parse(cidadeSalva);
        } catch (erro) {
          console.error('Não foi possível carregar a cidade salva.', erro);
          localStorage.removeItem(CHAVE_CIDADE_ATUAL);
          return null;
        }
      }

      const cidadeSalva = obterCidadeAtual();
      if (cidadeSalva) {
        carregarClima(cidadeSalva, null);
      }
      atualizarBotaoFavorito(); 

  }}); 

    item.append(botaoCidade, botaoRemover); 
    listaFavoritos.appendChild(item); 

  }); 


}

mostrarFavoritos();
