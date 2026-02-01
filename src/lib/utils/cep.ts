export interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

export async function fetchAddressByCep(cep: string): Promise<ViaCEPResponse | null> {
  const cleanCep = cep.replace(/\D/g, '');
  
  if (cleanCep.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching CEP:', error);
    return null;
  }
}

export async function fetchCepByAddress(uf: string, city: string, street: string): Promise<ViaCEPResponse[]> {
  if (uf.length !== 2 || city.length < 3 || street.length < 3) {
    return [];
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${uf}/${encodeURIComponent(city)}/${encodeURIComponent(street)}/json/`);
    const data = await response.json();

    if (Array.isArray(data)) {
      return data;
    }

    return [];
  } catch (error) {
    console.error('Error fetching address by search:', error);
    return [];
  }
}

export function formatCEP(cep: string): string {
  return cep
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
}
