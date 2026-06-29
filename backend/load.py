import bs4
import requests
from langchain_core.documents import Document

from docling.document_converter import DocumentConverter


def load_pdf(source : str) -> list[Document]:
   # source = "https://lweb.cfa.harvard.edu/~narayan/Benefunder/Narayan_McClintock.pdf"  
    converter = DocumentConverter()
    result = converter.convert(source)
    markdown_content = result.document.export_to_markdown()
    return [Document(page_content=markdown_content, metadata={"source": source})]

# if __name__ == "__main__":
#     main()

 

