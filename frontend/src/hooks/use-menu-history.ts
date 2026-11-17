import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

interface MenuLocationState {
  readonly isMenuOpen: true;
}

function isMenuLocationState(state: unknown): state is MenuLocationState {
  return (
    typeof state === 'object' &&
    state !== null &&
    'isMenuOpen' in state &&
    state.isMenuOpen === true
  );
}

interface MenuHistory {
  readonly isMenuOpen: boolean;
  readonly setMenuOpen: (isOpen: boolean) => void;
}

/**
 * O menu do celular vive no histórico: abrir cria uma entrada (mesmo endereço, com `isMenuOpen`) e
 * fechar volta uma. Assim o gesto de voltar do celular fecha o menu em vez de sair da tela, e
 * escolher uma área (que substitui a entrada, ver `AreaMenu`) deixa o histórico como se o menu nunca
 * tivesse existido.
 */
export function useMenuHistory(): MenuHistory {
  const location = useLocation();
  const navigate = useNavigate();
  const isMenuOpen = isMenuLocationState(location.state);

  const setMenuOpen = useCallback(
    (shouldOpen: boolean) => {
      if (shouldOpen === isMenuOpen) return;
      if (shouldOpen) {
        navigate(
          { pathname: location.pathname, search: location.search, hash: location.hash },
          { state: { isMenuOpen: true } satisfies MenuLocationState },
        );
        return;
      }
      navigate(-1);
    },
    [isMenuOpen, location.pathname, location.search, location.hash, navigate],
  );

  return { isMenuOpen, setMenuOpen };
}
