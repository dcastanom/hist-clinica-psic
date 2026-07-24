import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('no renderiza nada cuando hay una sola pagina o menos', () => {
    const { container: containerUnaPagina } = render(
      <Pagination page={1} pages={1} total={5} onPageChange={vi.fn()} />,
    );
    expect(containerUnaPagina).toBeEmptyDOMElement();

    const { container: containerCero } = render(
      <Pagination page={1} pages={0} total={0} onPageChange={vi.fn()} />,
    );
    expect(containerCero).toBeEmptyDOMElement();
  });

  it('muestra los numeros de pagina dentro de la ventana y el total', () => {
    render(<Pagination page={1} pages={3} total={45} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    expect(screen.getByText('45 en total')).toBeInTheDocument();
  });

  it('marca la pagina actual con aria-current', () => {
    render(<Pagination page={2} pages={3} total={45} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '1' })).not.toHaveAttribute('aria-current');
  });

  it('deshabilita Anterior en la primera pagina y Siguiente en la ultima', () => {
    const { rerender } = render(<Pagination page={1} pages={3} total={45} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).not.toBeDisabled();

    rerender(<Pagination page={3} pages={3} total={45} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  it('invoca onPageChange con el numero correcto al hacer click', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={2} pages={5} total={90} onPageChange={onPageChange} />);

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    await user.click(screen.getByRole('button', { name: '4' }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('centra la ventana de numeros alrededor de la pagina actual cuando hay muchas paginas', () => {
    render(<Pagination page={10} pages={20} total={400} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '9' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '11' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '12' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '20' })).not.toBeInTheDocument();
  });
});
