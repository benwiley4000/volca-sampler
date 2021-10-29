import React from 'react';
import { styled } from 'tonami';

const Title = styled.h1({
  display: 'flex',
  alignItems: 'center',
  padding: '2rem 1rem 1rem',
  marginBottom: '0px',
  backgroundColor: '#f3f3f3',
  borderBottom: '1px solid #ccc',
  position: 'sticky',
  top: 0
});

const MenuIcon = styled.span({
  marginRight: '1rem',
  cursor: 'pointer'
});

const TitleText = styled.span({
  color: 'red',
  whiteSpace: 'nowrap',
});

const TitleR = styled.span({
  textTransform: 'uppercase',
  textDecoration: 'underline',
});

const TitleGraphic = styled.img({
  height: '1.6em',
  paddingLeft: '1rem',
});

/**
 * @param {{ onMenuOpen: () => void }} props
 * @returns
 */
function Header({ onMenuOpen }) {
  return (
    <Title>
      <MenuIcon onClick={onMenuOpen}>☰</MenuIcon>
      <TitleText>
        Volca Sample
        <TitleR>r</TitleR>
      </TitleText>
      <TitleGraphic src="volca_sample.png" alt="" />
    </Title>
  );
}

export default Header;
