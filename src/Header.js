import React from 'react';
import { styled } from 'tonami';

const Title = styled.h1({
  display: 'flex',
  alignItems: 'center',
  padding: '2rem',
  paddingBottom: '0px',
  marginBottom: '0px',
});

const TitleText = styled.span({
  color: 'red',
});

const TitleR = styled.span({
  textTransform: 'uppercase',
  textDecoration: 'underline',
});

const TitleGraphic = styled.img({
  height: '1.6em',
  paddingLeft: '1rem',
});

function Header() {
  return (
    <Title>
      <TitleText>
        Volca Sample
        <TitleR>r</TitleR>
      </TitleText>
      <TitleGraphic src="volca_sample.png" alt="" />
    </Title>
  );
}

export default Header;
