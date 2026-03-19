const fileInput = document.getElementById('fileInput');
if (fileInput && !document.querySelector('input[name="tipoAjuste"]')) {
    const opcoesDiv = document.createElement('div');
    opcoesDiv.className = 'opcoes-ajuste';
    opcoesDiv.style.marginBottom = '15px';
    opcoesDiv.innerHTML = `
        <label style="cursor: pointer; font-size: 14px;">
            <input type="radio" name="tipoAjuste" value="valor" checked onchange="atualizarModoAjuste()">
            Ajuste pela Soma (Valor)
        </label>
        <label style="margin-left: 15px; cursor: pointer; font-size: 14px;">
            <input type="radio" name="tipoAjuste" value="quantidade" onchange="atualizarModoAjuste()">
            Ajuste pela Quantidade
        </label>
    `;
    fileInput.parentNode.insertBefore(opcoesDiv, fileInput);
}

function getModoAjuste() {
    const selecionado = document.querySelector('input[name="tipoAjuste"]:checked');
    return selecionado ? selecionado.value : 'valor';
}

window.atualizarModoAjuste = function() {

};

function atualizarSomaOriginal() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput ? fileInput.files[0] : null;
    if (!file) {
        document.getElementById('somaOriginal').value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
        const text = evt.target.result;
        const lines = text.split(/\r?\n/);
        let soma = 0;
        
        for (let i = 0; i < lines.length; i++) {
            let linha = lines[i];
        
            if (linha.startsWith("74") && linha.length >= 50) {
                let valorOriginalStr = linha.substring(37, 50);
                soma += parseInt(valorOriginalStr, 10) / 100;
            }
        }
        
        document.getElementById('somaOriginal').value = soma.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };
    reader.readAsText(file);
}

document.getElementById('fileInput').addEventListener('change', function(e) {
    atualizarSomaOriginal();
});

document.getElementById('somaDesejada').addEventListener('input', function(e) {
    let valor = e.target.value.replace(/\D/g, ''); 
    if (valor === '') {
        e.target.value = '';
        return;
    }
    
    valor = parseInt(valor, 10) / 100;
    e.target.value = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
});

function processarArquivo() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
        alert("Por favor, selecione um arquivo.");
        return;
    }

    const somaOriginalStr = document.getElementById('somaOriginal').value;
    const somaDesejadaStr = document.getElementById('somaDesejada').value;

    if (!somaOriginalStr || !somaDesejadaStr) {
        alert("Por favor, certifique-se de que o arquivo foi lido e preencha a soma desejada.");
        return;
    }

    function parseNumero(str) {
        let numero = str.replace(/[^\d,]/g, '').replace(',', '.');
        return parseFloat(numero);
    }

    const somaOriginal = parseNumero(somaOriginalStr);
    const somaDesejada = parseNumero(somaDesejadaStr);

    if (somaOriginal === 0) {
        alert("A soma original é zero. Não é possível calcular a proporção de ajuste.");
        return;
    }

    const btn = document.querySelector('button');
    const textoOriginalBtn = btn.innerText;
    btn.innerText = "Processando...";
    btn.disabled = true;

    const modo = getModoAjuste();

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const isCRLF = text.includes('\r\n');
        const lines = text.split(/\r?\n/);
        
        let somaFinanceiraOriginalInt = 0;
        let somaQuantidadeOriginalInt = 0;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("74") && lines[i].length >= 50) {
                somaQuantidadeOriginalInt += parseInt(lines[i].substring(24, 37), 10);
                somaFinanceiraOriginalInt += parseInt(lines[i].substring(37, 50), 10);
            }
        }

        const somaFinanceiraDesejadaInt = Math.round(somaDesejada * 100);
        let somaQuantidadeDesejadaInt = somaQuantidadeOriginalInt;

        if (modo === 'quantidade') {
            const fatorFinanceiro = somaFinanceiraOriginalInt > 0 ? (somaFinanceiraDesejadaInt / somaFinanceiraOriginalInt) : 0;
            somaQuantidadeDesejadaInt = Math.round(somaQuantidadeOriginalInt * fatorFinanceiro);
            
            const step = 1000;
            const totalDesejadoSteps = Math.round(somaQuantidadeDesejadaInt / step);
            somaQuantidadeDesejadaInt = totalDesejadoSteps * step;
        }
        
        let somaAcumuladaFinanceiraOriginal = 0;
        let somaAcumuladaFinanceiraDesejada = 0;

        let somaAcumuladaQuantidadeOriginal = 0;
        let somaAcumuladaQuantidadeDesejada = 0;

        let outputLines = [];

        for (let i = 0; i < lines.length; i++) {
            let linha = lines[i];
            
            if (linha.startsWith("74") && linha.length >= 50) {
                let prefixo = linha.substring(0, 24);
                let qtdOriginalStr = linha.substring(24, 37);
                let valorOriginalStr = linha.substring(37, 50);
                let sufixo = linha.substring(50);

                let qtdOriginalInt = parseInt(qtdOriginalStr, 10);
                let valorOriginalInt = parseInt(valorOriginalStr, 10);

                somaAcumuladaQuantidadeOriginal += qtdOriginalInt;
                somaAcumuladaFinanceiraOriginal += valorOriginalInt;
                
                let novaQtdInt = qtdOriginalInt;
                let novoValorInt = valorOriginalInt;
                
                if (modo === 'quantidade') {
                    let somaAcumuladaQtdIdeal = 0;
                    if (somaQuantidadeOriginalInt > 0) {
                        const step = 1000;
                        const totalSteps = Math.round(somaQuantidadeDesejadaInt / step);
                        somaAcumuladaQtdIdeal = Math.round((somaAcumuladaQuantidadeOriginal / somaQuantidadeOriginalInt) * totalSteps) * step;
                    }
                    novaQtdInt = somaAcumuladaQtdIdeal - somaAcumuladaQuantidadeDesejada;
                    somaAcumuladaQuantidadeDesejada += novaQtdInt;

                    let somaAcumuladaFinIdeal = 0;
                    if (somaQuantidadeDesejadaInt > 0) {
                        somaAcumuladaFinIdeal = Math.round((somaAcumuladaQuantidadeDesejada / somaQuantidadeDesejadaInt) * somaFinanceiraDesejadaInt);
                    } else if (somaFinanceiraOriginalInt > 0) {
                        somaAcumuladaFinIdeal = Math.round((somaAcumuladaFinanceiraOriginal / somaFinanceiraOriginalInt) * somaFinanceiraDesejadaInt);
                    }
                    novoValorInt = somaAcumuladaFinIdeal - somaAcumuladaFinanceiraDesejada;
                    somaAcumuladaFinanceiraDesejada += novoValorInt;
                } else {
                    let somaAcumuladaFinIdeal = 0;
                    if (somaFinanceiraOriginalInt > 0) {
                        somaAcumuladaFinIdeal = Math.round((somaAcumuladaFinanceiraOriginal / somaFinanceiraOriginalInt) * somaFinanceiraDesejadaInt);
                    }
                    novoValorInt = somaAcumuladaFinIdeal - somaAcumuladaFinanceiraDesejada;
                    somaAcumuladaFinanceiraDesejada += novoValorInt;
                }

                let novaQtdStr = novaQtdInt.toString().padStart(13, '0');
                let novoValorStr = novoValorInt.toString().padStart(13, '0');
                linha = prefixo + novaQtdStr + novoValorStr + sufixo;
            }
            
            outputLines.push(linha);
        }

        const novoConteudo = outputLines.join(isCRLF ? '\r\n' : '\n');
        const blob = new Blob([novoConteudo], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "sintegra_corrigido.txt";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        btn.innerText = textoOriginalBtn;
        btn.disabled = false;
    };
    
    reader.readAsText(file);
}